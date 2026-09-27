using FamilyJournalApi.Accessors;
using FamilyJournalApi.Accessors.DTOs;
using FamilyJournalApi.Common;
using FamilyJournalApi.Configuration;
using FamilyJournalApi.Managers.Events;
using FamilyJournalApi.Managers.Models;
using Microsoft.Extensions.Options;

namespace FamilyJournalApi.Managers;

/// <summary>
/// Posting: posts (with photos, tags and life events), the feed, reactions, comments and photo uploads.
/// </summary>
public class PostManager(
    IPostAccessor postAccessor,
    IProfileAccessor profileAccessor,
    IMediaAccessor mediaAccessor,
    IEventPublisher events,
    IOptions<MediaOptions> mediaOptions,
    TimeProvider timeProvider) : IPostManager
{
    public const int MaxFeedPage = 50;
    public const int MaxImageSide = 20_000;
    private const int PreviewLength = 140;

    public async Task<Result<FeedPageModel>> GetFeed(FamilyCaller caller, Guid? profileId, DateTimeOffset? before, int limit)
    {
        if (profileId is { } id && !(await profileAccessor.FindProfilesInFamily(caller.FamilyId, [id])).Contains(id))
        {
            return Result<FeedPageModel>.NotFound("That person isn't in this family.");
        }

        limit = Math.Clamp(limit, 1, MaxFeedPage);
        var posts = await postAccessor.GetFeed(caller.FamilyId, profileId, before, limit);
        var now = timeProvider.GetUtcNow();

        return new FeedPageModel
        {
            Posts = posts.Select(p => ToModel(caller, p, now)).ToList(),
            NextBefore = posts.Count == limit ? posts[^1].CreatedAt : null
        };
    }

    public async Task<Result<PostModel>> GetPost(FamilyCaller caller, Guid postId)
    {
        var post = await postAccessor.GetPost(caller.FamilyId, postId);

        return post is null ? Result<PostModel>.NotFound() : ToModel(caller, post, timeProvider.GetUtcNow());
    }

    public async Task<Result<PostModel>> CreatePost(FamilyCaller caller, PostRequest request)
    {
        var problem = await Validate(caller, request);

        if (problem is not null)
        {
            return Result<PostModel>.Invalid(problem);
        }

        var now = timeProvider.GetUtcNow();
        var postId = await postAccessor.CreatePost(caller.FamilyId, caller.ProfileId, ToContent(request), now);

        await events.Publish(new PostCreated(
            caller.FamilyId,
            postId,
            caller.ProfileId,
            request.TaggedProfileIds.Distinct().ToList(),
            Preview(request.LifeEvent?.Title ?? request.Text),
            now));

        return await GetPost(caller, postId);
    }

    public async Task<Result<PostModel>> UpdatePost(FamilyCaller caller, Guid postId, PostRequest request)
    {
        var existing = await postAccessor.GetPost(caller.FamilyId, postId);

        if (existing is null)
        {
            return Result<PostModel>.NotFound();
        }

        if (existing.AuthorProfileId != caller.ProfileId)
        {
            return Result<PostModel>.Forbidden("Only the person who posted this can edit it.");
        }

        var problem = await Validate(caller, request);

        if (problem is not null)
        {
            return Result<PostModel>.Invalid(problem);
        }

        await postAccessor.UpdatePost(postId, ToContent(request), timeProvider.GetUtcNow());

        return await GetPost(caller, postId);
    }

    public async Task<Result<Done>> DeletePost(FamilyCaller caller, Guid postId)
    {
        var existing = await postAccessor.GetPost(caller.FamilyId, postId);

        if (existing is null)
        {
            return Result<Done>.NotFound();
        }

        if (!CanDelete(caller, existing))
        {
            return Result<Done>.Forbidden("Only the person who posted this, or an admin, can delete it.");
        }

        await postAccessor.DeletePost(postId);

        return Done.Value;
    }

    public async Task<Result<List<ReactionModel>>> React(FamilyCaller caller, Guid postId, string emoji)
    {
        emoji = emoji.Trim();

        if (!EmojiText.IsSingleEmoji(emoji))
        {
            return Result<List<ReactionModel>>.Invalid("A reaction has to be a single emoji.");
        }

        var post = await postAccessor.GetPost(caller.FamilyId, postId);

        if (post is null)
        {
            return Result<List<ReactionModel>>.NotFound();
        }

        var now = timeProvider.GetUtcNow();
        var changed = await postAccessor.SetReaction(postId, caller.ProfileId, emoji, now);

        if (changed && post.AuthorProfileId != caller.ProfileId)
        {
            await events.Publish(new ReactionAdded(caller.FamilyId, postId, caller.ProfileId, post.AuthorProfileId, emoji, now));
        }

        return await Reactions(postId);
    }

    public async Task<Result<List<ReactionModel>>> RemoveReaction(FamilyCaller caller, Guid postId)
    {
        if (await postAccessor.GetPost(caller.FamilyId, postId) is null)
        {
            return Result<List<ReactionModel>>.NotFound();
        }

        await postAccessor.RemoveReaction(postId, caller.ProfileId);

        return await Reactions(postId);
    }

    public async Task<Result<List<ReactionModel>>> GetReactions(FamilyCaller caller, Guid postId)
    {
        if (await postAccessor.GetPost(caller.FamilyId, postId) is null)
        {
            return Result<List<ReactionModel>>.NotFound();
        }

        return await Reactions(postId);
    }

    public async Task<Result<List<CommentModel>>> GetComments(FamilyCaller caller, Guid postId)
    {
        var post = await postAccessor.GetPost(caller.FamilyId, postId);

        if (post is null)
        {
            return Result<List<CommentModel>>.NotFound();
        }

        var comments = await postAccessor.GetComments(postId);

        return comments.Select(c => ToModel(caller, post, c)).ToList();
    }

    public async Task<Result<CommentModel>> AddComment(FamilyCaller caller, Guid postId, CommentRequest request)
    {
        var post = await postAccessor.GetPost(caller.FamilyId, postId);

        if (post is null)
        {
            return Result<CommentModel>.NotFound();
        }

        var text = request.Text.Trim();

        if (text.Length == 0)
        {
            return Result<CommentModel>.Invalid("Write something first.");
        }

        var mentions = request.MentionedProfileIds.Distinct().ToList();
        var found = await profileAccessor.FindProfilesInFamily(caller.FamilyId, mentions);

        if (found.Count != mentions.Count)
        {
            return Result<CommentModel>.Invalid("You can only mention people in this family.");
        }

        var now = timeProvider.GetUtcNow();
        var comment = await postAccessor.AddComment(postId, caller.ProfileId, text, mentions, now);

        await events.Publish(new CommentAdded(
            caller.FamilyId, postId, comment.Id, caller.ProfileId, post.AuthorProfileId, mentions, Preview(text), now));

        return ToModel(caller, post, comment);
    }

    public async Task<Result<Done>> DeleteComment(FamilyCaller caller, Guid postId, Guid commentId)
    {
        var post = await postAccessor.GetPost(caller.FamilyId, postId);
        var comment = post is null ? null : await postAccessor.GetComment(postId, commentId);

        if (post is null || comment is null)
        {
            return Result<Done>.NotFound();
        }

        if (!CanDeleteComment(caller, post, comment))
        {
            return Result<Done>.Forbidden("Only the commenter, the person who posted, or an admin can delete this comment.");
        }

        await postAccessor.DeleteComment(commentId);

        return Done.Value;
    }

    public async Task<Result<MediaModel>> UploadPhoto(FamilyCaller caller, Stream content, long length, int width, int height)
    {
        if (length <= 0)
        {
            return Result<MediaModel>.Invalid("The file is empty.");
        }

        if (length > mediaOptions.Value.MaxUploadBytes)
        {
            return Result<MediaModel>.Invalid($"Photos can be up to {mediaOptions.Value.MaxUploadBytes / (1024 * 1024)} MB.");
        }

        if (width is < 1 or > MaxImageSide || height is < 1 or > MaxImageSide)
        {
            return Result<MediaModel>.Invalid("Include the photo's width and height in pixels.");
        }

        // Judge the file by its bytes, not its name or declared type
        var header = new byte[ImageFormats.HeaderLength];
        var read = await content.ReadAtLeastAsync(header, header.Length, throwOnEndOfStream: false);
        var contentType = ImageFormats.Detect(header.AsSpan(0, read));

        if (contentType is null)
        {
            return Result<MediaModel>.Invalid("That file isn't a supported photo (JPEG, PNG, GIF, WebP or HEIC).");
        }

        content.Position = 0;
        var now = timeProvider.GetUtcNow();
        var media = await mediaAccessor.SaveMedia(caller.FamilyId, caller.ProfileId, content, contentType, width, height, now);

        return new MediaModel
        {
            Id = media.Id,
            Url = mediaAccessor.GetSignedUrl(media.Id, now),
            ContentType = media.ContentType,
            Width = media.Width,
            Height = media.Height
        };
    }

    public async Task<PhotoFile?> OpenPhoto(Guid mediaId, long expiresAtUnix, string signature)
    {
        // The signature is the permission: it was only handed to a family member
        if (!mediaAccessor.IsValidSignature(mediaId, expiresAtUnix, signature, timeProvider.GetUtcNow()))
        {
            return null;
        }

        var media = await mediaAccessor.GetMedia(mediaId);

        return media is null ? null : new PhotoFile(mediaAccessor.OpenRead(media.StorageKey), media.ContentType);
    }

    private async Task<string?> Validate(FamilyCaller caller, PostRequest request)
    {
        var hasText = !string.IsNullOrWhiteSpace(request.Text);

        if (!hasText && request.Photos.Count == 0 && request.LifeEvent is null)
        {
            return "Add some words, a photo, or a life event.";
        }

        if (request.LifeEvent is { } lifeEvent)
        {
            if (!LifeEventTypes.IsValid(lifeEvent.Type))
            {
                return "That isn't a life event type the app knows.";
            }

            if (lifeEvent.Type == LifeEventTypes.Custom && string.IsNullOrWhiteSpace(lifeEvent.Label))
            {
                return "Name your life event.";
            }

            if (string.IsNullOrWhiteSpace(lifeEvent.Title))
            {
                return "Give the life event a headline.";
            }
        }

        var tagged = request.TaggedProfileIds.Distinct().ToList();

        if ((await profileAccessor.FindProfilesInFamily(caller.FamilyId, tagged)).Count != tagged.Count)
        {
            return "You can only tag people in this family.";
        }

        var photoIds = request.Photos.Select(p => p.MediaId).Distinct().ToList();

        if ((await mediaAccessor.GetMediaInFamily(caller.FamilyId, photoIds)).Count != photoIds.Count)
        {
            return "One of those photos isn't in this family. Upload it first.";
        }

        return null;
    }

    private static PostContentDto ToContent(PostRequest request)
    {
        var lifeEvent = request.LifeEvent;

        return new PostContentDto
        {
            Content = request.Text.Trim(),
            LifeEventType = lifeEvent?.Type,
            LifeEventLabel = lifeEvent?.Type == LifeEventTypes.Custom ? lifeEvent.Label?.Trim() : null,
            LifeEventTitle = lifeEvent?.Title.Trim(),
            LifeEventDate = lifeEvent?.Date,
            TaggedProfileIds = request.TaggedProfileIds,
            Photos = request.Photos
                .Select(p => (p.MediaId, string.IsNullOrWhiteSpace(p.AltText) ? null : p.AltText.Trim()))
                .ToList()
        };
    }

    private async Task<List<ReactionModel>> Reactions(Guid postId)
    {
        var reactions = await postAccessor.GetReactions(postId);

        return reactions.Select(r => new ReactionModel { ProfileId = r.ProfileId, Emoji = r.Emoji }).ToList();
    }

    private static bool CanDelete(FamilyCaller caller, PostDto post) =>
        caller.IsAdmin || post.AuthorProfileId == caller.ProfileId;

    private static bool CanDeleteComment(FamilyCaller caller, PostDto post, CommentDto comment) =>
        caller.IsAdmin || comment.AuthorProfileId == caller.ProfileId || post.AuthorProfileId == caller.ProfileId;

    private static string Preview(string text)
    {
        var flat = string.Join(' ', text.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries));

        return flat.Length <= PreviewLength ? flat : flat[..(PreviewLength - 1)].TrimEnd() + "…";
    }

    private PostModel ToModel(FamilyCaller caller, PostDto post, DateTimeOffset now) => new()
    {
        Id = post.Id,
        AuthorProfileId = post.AuthorProfileId,
        Text = post.Content,
        LifeEvent = post.LifeEventType is null
            ? null
            : new LifeEventModel
            {
                Type = post.LifeEventType,
                Label = post.LifeEventLabel,
                Title = post.LifeEventTitle ?? string.Empty,
                Date = post.LifeEventDate ?? DateOnly.FromDateTime(post.CreatedAt.UtcDateTime)
            },
        Photos = post.Photos
            .Select(p => new PhotoModel
            {
                MediaId = p.MediaId,
                Url = mediaAccessor.GetSignedUrl(p.MediaId, now),
                Width = p.Width,
                Height = p.Height,
                AltText = p.AltText
            })
            .ToList(),
        TaggedProfileIds = post.TaggedProfileIds,
        Reactions = post.Reactions.Select(r => new ReactionModel { ProfileId = r.ProfileId, Emoji = r.Emoji }).ToList(),
        CommentCount = post.CommentCount,
        LatestComments = post.LatestComments.Select(c => ToModel(caller, post, c)).ToList(),
        CreatedAt = post.CreatedAt,
        UpdatedAt = post.UpdatedAt,
        CanEdit = post.AuthorProfileId == caller.ProfileId,
        CanDelete = CanDelete(caller, post)
    };

    private static CommentModel ToModel(FamilyCaller caller, PostDto post, CommentDto comment) => new()
    {
        Id = comment.Id,
        AuthorProfileId = comment.AuthorProfileId,
        Text = comment.Content,
        MentionedProfileIds = comment.MentionedProfileIds,
        CreatedAt = comment.CreatedAt,
        CanDelete = CanDeleteComment(caller, post, comment)
    };
}
