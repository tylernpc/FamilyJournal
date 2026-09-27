using FamilyJournalApi.Managers.Models;

namespace FamilyJournalApi.Managers;

public interface IPostManager
{
    /// <summary>
    /// Newest first. With a profile id, only posts that person wrote or is tagged in.
    /// </summary>
    Task<Result<FeedPageModel>> GetFeed(FamilyCaller caller, Guid? profileId, DateTimeOffset? before, int limit);

    Task<Result<PostModel>> GetPost(FamilyCaller caller, Guid postId);

    Task<Result<PostModel>> CreatePost(FamilyCaller caller, PostRequest request);

    Task<Result<PostModel>> UpdatePost(FamilyCaller caller, Guid postId, PostRequest request);

    Task<Result<Done>> DeletePost(FamilyCaller caller, Guid postId);

    /// <summary>
    /// Sets the caller's reaction to any single emoji, replacing their previous one.
    /// </summary>
    Task<Result<List<ReactionModel>>> React(FamilyCaller caller, Guid postId, string emoji);

    Task<Result<List<ReactionModel>>> RemoveReaction(FamilyCaller caller, Guid postId);

    Task<Result<List<ReactionModel>>> GetReactions(FamilyCaller caller, Guid postId);

    Task<Result<List<CommentModel>>> GetComments(FamilyCaller caller, Guid postId);

    Task<Result<CommentModel>> AddComment(FamilyCaller caller, Guid postId, CommentRequest request);

    Task<Result<Done>> DeleteComment(FamilyCaller caller, Guid postId, Guid commentId);

    /// <summary>
    /// Stores a photo for use in posts or as a profile picture. The client supplies the pixel size,
    /// since it already knows it and decoding images here would need a heavy dependency.
    /// </summary>
    Task<Result<MediaModel>> UploadPhoto(FamilyCaller caller, Stream content, long length, int width, int height);

    /// <summary>
    /// The photo behind a signed URL, or null if the signature is wrong or expired.
    /// </summary>
    Task<PhotoFile?> OpenPhoto(Guid mediaId, long expiresAtUnix, string signature);
}
