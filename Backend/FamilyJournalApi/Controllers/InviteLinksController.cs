using FamilyJournalApi.Configuration;
using FamilyJournalApi.Managers;
using FamilyJournalApi.Managers.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace FamilyJournalApi.Controllers;

/// <summary>
/// What an invite link opens: a preview before sign-in, then joining once signed in.
/// </summary>
[ApiController]
[Route("api/invites/{token}")]
[EnableRateLimiting(AuthConfiguration.RateLimitPolicy)]
public class InviteLinksController(IFamilyManager familyManager) : ControllerBase
{
    [AllowAnonymous]
    [HttpGet]
    [ProducesResponseType<InvitePreviewModel>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<InvitePreviewModel>> Preview(string token)
    {
        var preview = await familyManager.PreviewInvite(token);

        return preview is null
            ? Problem(statusCode: StatusCodes.Status404NotFound, title: "This invite link has expired or was already used.")
            : preview;
    }

    [HttpPost("accept")]
    [ProducesResponseType<UserFamilyModel>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<UserFamilyModel>> Accept(string token, AcceptInviteRequest request)
    {
        var result = await familyManager.AcceptInvite(User.GetUserId(), token, request);

        if (result.Succeeded)
        {
            return result.Value!;
        }

        return Problem(
            statusCode: result.Error == ResultError.NotFound ? StatusCodes.Status404NotFound : StatusCodes.Status409Conflict,
            title: result.Message);
    }
}
