using FamilyJournalApi.Accessors;
using FamilyJournalApi.Accessors.DTOs;

namespace FamilyJournalApi.Tests.Fakes;

public class FakePostAccessor(FakeDatabase db) : IPostAccessor
{
    private readonly List<PostDto> posts = [];
    private readonly List<CommentDto> comments = [];

    public Task<Guid> CreatePost(Guid familyId, Guid authorProfileId, PostContentDto content, DateTimeOffset createdAt)
    {
        var post = new PostDto { Id = Guid.NewGuid(), FamilyId = familyId, AuthorProfileId = authorProfileId, CreatedAt = createdAt };
        Apply(post, content);
        posts.Add(post);
        return Task.FromResult(post.Id);
    }

    public Task<List<PostDto>> GetFeed(Guid familyId, Guid? profileId, DateTimeOffset? before, int limit) =>
        Task.FromResult(posts
            .Where(p => p.FamilyId == familyId)
            .Where(p => profileId is null || p.AuthorProfileId == profileId || p.TaggedProfileIds.Contains(profileId.Value))
            .Where(p => before is null || p.CreatedAt < before)
            .OrderByDescending(p => p.CreatedAt)
            .Take(limit)
            .Select(WithComments)
            .ToList());

    public Task<PostDto?> GetPost(Guid familyId, Guid postId) =>
        Task.FromResult(posts.Where(p => p.FamilyId == familyId && p.Id == postId).Select(WithComments).SingleOrDefault());

    public Task UpdatePost(Guid postId, PostContentDto content, DateTimeOffset updatedAt)
    {
        var post = posts.Single(p => p.Id == postId);
        Apply(post, content);
        post.UpdatedAt = updatedAt;
        return Task.CompletedTask;
    }

    public Task DeletePost(Guid postId)
    {
        posts.RemoveAll(p => p.Id == postId);
        comments.RemoveAll(c => c.PostId == postId);
        return Task.CompletedTask;
    }

    public Task<bool> SetReaction(Guid postId, Guid profileId, string emoji, DateTimeOffset reactedAt)
    {
        var post = posts.Single(p => p.Id == postId);
        var existing = post.Reactions.SingleOrDefault(r => r.ProfileId == profileId);

        if (existing?.Emoji == emoji)
        {
            return Task.FromResult(false);
        }

        post.Reactions.RemoveAll(r => r.ProfileId == profileId);
        post.Reactions.Add(new ReactionDto { ProfileId = profileId, Emoji = emoji, CreatedAt = reactedAt });
        return Task.FromResult(true);
    }

    public Task RemoveReaction(Guid postId, Guid profileId)
    {
        posts.Single(p => p.Id == postId).Reactions.RemoveAll(r => r.ProfileId == profileId);
        return Task.CompletedTask;
    }

    public Task<List<ReactionDto>> GetReactions(Guid postId) => Task.FromResult(posts.Single(p => p.Id == postId).Reactions.ToList());

    public Task<CommentDto> AddComment(Guid postId, Guid authorProfileId, string content, IEnumerable<Guid> mentionedProfileIds, DateTimeOffset createdAt)
    {
        var comment = new CommentDto
        {
            Id = Guid.NewGuid(),
            PostId = postId,
            AuthorProfileId = authorProfileId,
            Content = content,
            CreatedAt = createdAt,
            MentionedProfileIds = mentionedProfileIds.ToList()
        };

        comments.Add(comment);
        return Task.FromResult(comment);
    }

    public Task<List<CommentDto>> GetComments(Guid postId) => Task.FromResult(comments.Where(c => c.PostId == postId).ToList());

    public Task<CommentDto?> GetComment(Guid postId, Guid commentId) =>
        Task.FromResult(comments.SingleOrDefault(c => c.PostId == postId && c.Id == commentId));

    public Task DeleteComment(Guid commentId)
    {
        comments.RemoveAll(c => c.Id == commentId);
        return Task.CompletedTask;
    }

    private PostDto WithComments(PostDto post)
    {
        var mine = comments.Where(c => c.PostId == post.Id).ToList();
        post.CommentCount = mine.Count;
        post.LatestComments = mine.TakeLast(2).ToList();
        return post;
    }

    private void Apply(PostDto post, PostContentDto content)
    {
        post.Content = content.Content;
        post.LifeEventType = content.LifeEventType;
        post.LifeEventLabel = content.LifeEventLabel;
        post.LifeEventTitle = content.LifeEventTitle;
        post.LifeEventDate = content.LifeEventDate;
        post.TaggedProfileIds = content.TaggedProfileIds.Distinct().ToList();
        post.Photos = content.Photos
            .Select(p => new PostPhotoDto { MediaId = p.MediaId, AltText = p.AltText, Width = db.Media[p.MediaId].Width, Height = db.Media[p.MediaId].Height })
            .ToList();
    }
}
