using FamilyJournalApi.Accessors.DTOs;
using FamilyJournalApi.Accessors.Entities;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace FamilyJournalApi.Accessors;

public class PostAccessor(DatabaseContext db) : IPostAccessor
{
    private const int LatestCommentCount = 2;
    private static readonly int[] DuplicateKeyErrors = [2601, 2627];

    public async Task<Guid> CreatePost(Guid familyId, Guid authorProfileId, PostContentDto content, DateTimeOffset createdAt)
    {
        var post = new Post
        {
            FamilyId = familyId,
            AuthorProfileId = authorProfileId,
            CreatedAt = createdAt
        };
        Apply(post, content);

        db.Posts.Add(post);
        await db.SaveChangesAsync();

        return post.Id;
    }

    public async Task<List<PostDto>> GetFeed(Guid familyId, Guid? profileId, DateTimeOffset? before, int limit)
    {
        var query = db.Posts.AsNoTracking().Where(p => p.FamilyId == familyId);

        if (profileId is { } id)
        {
            query = query.Where(p => p.AuthorProfileId == id || p.Tags.Any(t => t.ProfileId == id));
        }

        if (before is { } cursor)
        {
            query = query.Where(p => p.CreatedAt < cursor);
        }

        var posts = await Project(query.OrderByDescending(p => p.CreatedAt).Take(limit)).ToListAsync();

        return posts.Select(OldestCommentFirst).ToList();
    }

    public async Task<PostDto?> GetPost(Guid familyId, Guid postId)
    {
        var post = await Project(db.Posts.AsNoTracking().Where(p => p.FamilyId == familyId && p.Id == postId))
            .SingleOrDefaultAsync();

        return post is null ? null : OldestCommentFirst(post);
    }

    public async Task UpdatePost(Guid postId, PostContentDto content, DateTimeOffset updatedAt)
    {
        await using var transaction = await db.Database.BeginTransactionAsync();

        // Clear the old tags and photos outside change tracking, so re-adding the same ones doesn't clash
        await db.PostTags.Where(t => t.PostId == postId).ExecuteDeleteAsync();
        await db.PostPhotos.Where(ph => ph.PostId == postId).ExecuteDeleteAsync();

        var post = await db.Posts.SingleAsync(p => p.Id == postId);
        Apply(post, content);
        post.UpdatedAt = updatedAt;

        await db.SaveChangesAsync();
        await transaction.CommitAsync();
    }

    public async Task DeletePost(Guid postId)
    {
        await using var transaction = await db.Database.BeginTransactionAsync();

        await db.Notifications.Where(n => n.PostId == postId).ExecuteDeleteAsync();
        await db.CommentMentions.Where(m => m.Comment.PostId == postId).ExecuteDeleteAsync();
        await db.Comments.Where(c => c.PostId == postId).ExecuteDeleteAsync();
        await db.Reactions.Where(r => r.PostId == postId).ExecuteDeleteAsync();
        await db.PostTags.Where(t => t.PostId == postId).ExecuteDeleteAsync();
        await db.PostPhotos.Where(ph => ph.PostId == postId).ExecuteDeleteAsync();
        await db.Posts.Where(p => p.Id == postId).ExecuteDeleteAsync();

        await transaction.CommitAsync();
    }

    public async Task<bool> SetReaction(Guid postId, Guid profileId, string emoji, DateTimeOffset reactedAt)
    {
        var existing = await db.Reactions.SingleOrDefaultAsync(r => r.PostId == postId && r.ProfileId == profileId);

        if (existing is not null)
        {
            if (existing.Emoji == emoji)
            {
                return false;
            }

            existing.Emoji = emoji;
            existing.CreatedAt = reactedAt;
            await db.SaveChangesAsync();
            return true;
        }

        var reaction = new Reaction { PostId = postId, ProfileId = profileId, Emoji = emoji, CreatedAt = reactedAt };
        db.Reactions.Add(reaction);

        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ex.InnerException is SqlException sql && DuplicateKeyErrors.Contains(sql.Number))
        {
            // Two taps racing: the other insert won, so update it instead
            db.Entry(reaction).State = EntityState.Detached;
            await db.Reactions
                .Where(r => r.PostId == postId && r.ProfileId == profileId)
                .ExecuteUpdateAsync(set => set.SetProperty(r => r.Emoji, emoji).SetProperty(r => r.CreatedAt, reactedAt));
        }

        return true;
    }

    public async Task RemoveReaction(Guid postId, Guid profileId)
    {
        await db.Reactions.Where(r => r.PostId == postId && r.ProfileId == profileId).ExecuteDeleteAsync();
    }

    public async Task<List<ReactionDto>> GetReactions(Guid postId)
    {
        return await db.Reactions
            .AsNoTracking()
            .Where(r => r.PostId == postId)
            .OrderBy(r => r.CreatedAt)
            .Select(r => new ReactionDto { ProfileId = r.ProfileId, Emoji = r.Emoji, CreatedAt = r.CreatedAt })
            .ToListAsync();
    }

    public async Task<CommentDto> AddComment(Guid postId, Guid authorProfileId, string content, IEnumerable<Guid> mentionedProfileIds, DateTimeOffset createdAt)
    {
        var comment = new Comment
        {
            PostId = postId,
            AuthorProfileId = authorProfileId,
            Content = content,
            CreatedAt = createdAt
        };

        foreach (var profileId in mentionedProfileIds.Distinct())
        {
            comment.Mentions.Add(new CommentMention { CommentId = comment.Id, ProfileId = profileId });
        }

        db.Comments.Add(comment);
        await db.SaveChangesAsync();

        return new CommentDto
        {
            Id = comment.Id,
            PostId = postId,
            AuthorProfileId = authorProfileId,
            Content = content,
            CreatedAt = createdAt,
            MentionedProfileIds = comment.Mentions.Select(m => m.ProfileId).ToList()
        };
    }

    public async Task<List<CommentDto>> GetComments(Guid postId)
    {
        return await Comments(db.Comments.Where(c => c.PostId == postId).OrderBy(c => c.CreatedAt)).ToListAsync();
    }

    public async Task<CommentDto?> GetComment(Guid postId, Guid commentId)
    {
        return await Comments(db.Comments.Where(c => c.PostId == postId && c.Id == commentId)).SingleOrDefaultAsync();
    }

    public async Task DeleteComment(Guid commentId)
    {
        await using var transaction = await db.Database.BeginTransactionAsync();

        await db.CommentMentions.Where(m => m.CommentId == commentId).ExecuteDeleteAsync();
        await db.Comments.Where(c => c.Id == commentId).ExecuteDeleteAsync();

        await transaction.CommitAsync();
    }

    private static IQueryable<CommentDto> Comments(IQueryable<Comment> comments) =>
        comments
            .AsNoTracking()
            .Select(c => new CommentDto
            {
                Id = c.Id,
                PostId = c.PostId,
                AuthorProfileId = c.AuthorProfileId,
                Content = c.Content,
                CreatedAt = c.CreatedAt,
                MentionedProfileIds = c.Mentions.Select(m => m.ProfileId).ToList()
            });

    private static IQueryable<PostDto> Project(IQueryable<Post> posts) =>
        posts
            .Select(p => new PostDto
            {
                Id = p.Id,
                FamilyId = p.FamilyId,
                AuthorProfileId = p.AuthorProfileId,
                Content = p.Content,
                LifeEventType = p.LifeEventType,
                LifeEventLabel = p.LifeEventLabel,
                LifeEventTitle = p.LifeEventTitle,
                LifeEventDate = p.LifeEventDate,
                CreatedAt = p.CreatedAt,
                UpdatedAt = p.UpdatedAt,
                Photos = p.Photos
                    .OrderBy(ph => ph.SortOrder)
                    .Select(ph => new PostPhotoDto
                    {
                        MediaId = ph.MediaId,
                        Width = ph.Media.Width,
                        Height = ph.Media.Height,
                        AltText = ph.AltText
                    })
                    .ToList(),
                TaggedProfileIds = p.Tags.Select(t => t.ProfileId).ToList(),
                Reactions = p.Reactions
                    .OrderBy(r => r.CreatedAt)
                    .Select(r => new ReactionDto { ProfileId = r.ProfileId, Emoji = r.Emoji, CreatedAt = r.CreatedAt })
                    .ToList(),
                CommentCount = p.Comments.Count(),
                LatestComments = p.Comments
                    .OrderByDescending(c => c.CreatedAt)
                    .Take(LatestCommentCount)
                    .Select(c => new CommentDto
                    {
                        Id = c.Id,
                        PostId = c.PostId,
                        AuthorProfileId = c.AuthorProfileId,
                        Content = c.Content,
                        CreatedAt = c.CreatedAt,
                        MentionedProfileIds = c.Mentions.Select(m => m.ProfileId).ToList()
                    })
                    .ToList()
            })
            .AsSplitQuery();

    private static PostDto OldestCommentFirst(PostDto post)
    {
        post.LatestComments.Reverse();
        return post;
    }

    private static void Apply(Post post, PostContentDto content)
    {
        post.Content = content.Content;
        post.LifeEventType = content.LifeEventType;
        post.LifeEventLabel = content.LifeEventLabel;
        post.LifeEventTitle = content.LifeEventTitle;
        post.LifeEventDate = content.LifeEventDate;
        post.IsLifeEvent = content.LifeEventType is not null;

        foreach (var profileId in content.TaggedProfileIds.Distinct())
        {
            post.Tags.Add(new PostTag { PostId = post.Id, ProfileId = profileId });
        }

        var order = 0;
        foreach (var (mediaId, altText) in content.Photos.DistinctBy(p => p.MediaId))
        {
            post.Photos.Add(new PostPhoto { PostId = post.Id, MediaId = mediaId, SortOrder = order++, AltText = altText });
        }
    }
}
