using FamilyJournalApi.Managers;
using FamilyJournalApi.Managers.Models;
using Microsoft.AspNetCore.Mvc;

namespace FamilyJournalApi.Controllers;

/// <summary>
/// The feed, posts, reactions and comments.
/// </summary>
public class PostsController(IPostManager postManager) : FamilyControllerBase
{
    /// <param name="profileId">Only posts this person wrote or is tagged in</param>
    /// <param name="before">The nextBefore value from the previous page</param>
    /// <param name="limit">Posts per page, up to 50</param>
    [HttpGet("posts")]
    [ProducesResponseType<FeedPageModel>(StatusCodes.Status200OK)]
    public async Task<ActionResult<FeedPageModel>> GetFeed(Guid? profileId, DateTimeOffset? before, int limit = 20) =>
        Respond(await postManager.GetFeed(Caller, profileId, before, limit));

    [HttpGet("posts/{postId:guid}")]
    [ProducesResponseType<PostModel>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PostModel>> GetPost(Guid postId) =>
        Respond(await postManager.GetPost(Caller, postId));

    [HttpPost("posts")]
    [ProducesResponseType<PostModel>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<PostModel>> CreatePost(PostRequest request)
    {
        var result = await postManager.CreatePost(Caller, request);

        return result.Succeeded
            ? CreatedAtAction(nameof(GetPost), new { familyId = Caller.FamilyId, postId = result.Value!.Id }, result.Value)
            : Failure(result.Error!.Value, result.Message);
    }

    [HttpPut("posts/{postId:guid}")]
    [ProducesResponseType<PostModel>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<PostModel>> UpdatePost(Guid postId, PostRequest request) =>
        Respond(await postManager.UpdatePost(Caller, postId, request));

    [HttpDelete("posts/{postId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> DeletePost(Guid postId) =>
        RespondNoContent(await postManager.DeletePost(Caller, postId));

    /// <summary>
    /// Sets your reaction to any single emoji, replacing your previous one. Returns everyone's reactions.
    /// </summary>
    [HttpPut("posts/{postId:guid}/reaction")]
    [ProducesResponseType<List<ReactionModel>>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<List<ReactionModel>>> React(Guid postId, ReactionRequest request) =>
        Respond(await postManager.React(Caller, postId, request.Emoji));

    [HttpDelete("posts/{postId:guid}/reaction")]
    [ProducesResponseType<List<ReactionModel>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<List<ReactionModel>>> RemoveReaction(Guid postId) =>
        Respond(await postManager.RemoveReaction(Caller, postId));

    [HttpGet("posts/{postId:guid}/reactions")]
    [ProducesResponseType<List<ReactionModel>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<List<ReactionModel>>> GetReactions(Guid postId) =>
        Respond(await postManager.GetReactions(Caller, postId));

    [HttpGet("posts/{postId:guid}/comments")]
    [ProducesResponseType<List<CommentModel>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<List<CommentModel>>> GetComments(Guid postId) =>
        Respond(await postManager.GetComments(Caller, postId));

    [HttpPost("posts/{postId:guid}/comments")]
    [ProducesResponseType<CommentModel>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<CommentModel>> AddComment(Guid postId, CommentRequest request) =>
        Respond(await postManager.AddComment(Caller, postId, request));

    [HttpDelete("posts/{postId:guid}/comments/{commentId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> DeleteComment(Guid postId, Guid commentId) =>
        RespondNoContent(await postManager.DeleteComment(Caller, postId, commentId));
}
