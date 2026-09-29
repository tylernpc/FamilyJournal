using FamilyJournalApi.Accessors.DTOs;

namespace FamilyJournalApi.Accessors;

public interface IPostAccessor
{
    Task<Guid> CreatePost(Guid familyId, Guid authorProfileId, PostContentDto content, DateTimeOffset createdAt);

    /// <summary>
    /// Newest first. With a profile id, only posts that person wrote or is tagged in.
    /// Pass the CreatedAt of the last post you have as <paramref name="before"/> for the next page.
    /// </summary>
    Task<List<PostDto>> GetFeed(Guid familyId, Guid? profileId, DateTimeOffset? before, int limit);

    Task<PostDto?> GetPost(Guid familyId, Guid postId);

    /// <summary>
    /// Replaces the post's text, life event, tags and photos.
    /// </summary>
    Task UpdatePost(Guid postId, PostContentDto content, DateTimeOffset updatedAt);

    /// <summary>
    /// Deletes the post with its photos links, tags, comments, reactions and notifications.
    /// The photos themselves stay in media storage.
    /// </summary>
    Task DeletePost(Guid postId);

    /// <summary>
    /// Adds or replaces this person's reaction. Returns true if it's new or changed.
    /// </summary>
    Task<bool> SetReaction(Guid postId, Guid profileId, string emoji, DateTimeOffset reactedAt);

    Task RemoveReaction(Guid postId, Guid profileId);

    Task<List<ReactionDto>> GetReactions(Guid postId);

    Task<CommentDto> AddComment(Guid postId, Guid authorProfileId, string content, IEnumerable<Guid> mentionedProfileIds, DateTimeOffset createdAt);

    Task<List<CommentDto>> GetComments(Guid postId);

    Task<CommentDto?> GetComment(Guid postId, Guid commentId);

    Task DeleteComment(Guid commentId);
}
