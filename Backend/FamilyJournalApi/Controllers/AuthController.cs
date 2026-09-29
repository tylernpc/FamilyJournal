using FamilyJournalApi.Configuration;
using FamilyJournalApi.Managers;
using FamilyJournalApi.Managers.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace FamilyJournalApi.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(IAccountManager accountManager) : ControllerBase
{
    // Credential endpoints are rate limited per IP; /me is not, since the app calls it often
    [AllowAnonymous]
    [EnableRateLimiting(AuthConfiguration.RateLimitPolicy)]
    [HttpPost("register")]
    [ProducesResponseType<AuthTokensModel>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<AuthTokensModel>> Register(RegisterRequest request)
    {
        var result = await accountManager.Register(request);

        return result.Tokens is not null
            ? CreatedAtAction(nameof(GetAccount), null, result.Tokens)
            : Failure(result);
    }

    [AllowAnonymous]
    [EnableRateLimiting(AuthConfiguration.RateLimitPolicy)]
    [HttpPost("login")]
    [ProducesResponseType<AuthTokensModel>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status423Locked)]
    public async Task<ActionResult<AuthTokensModel>> SignIn(SignInRequest request)
    {
        var result = await accountManager.SignIn(request);

        return result.Tokens is not null ? result.Tokens : Failure(result);
    }

    [AllowAnonymous]
    [EnableRateLimiting(AuthConfiguration.TokenRateLimitPolicy)]
    [HttpPost("refresh")]
    [ProducesResponseType<AuthTokensModel>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<AuthTokensModel>> Refresh(RefreshRequest request)
    {
        var result = await accountManager.Refresh(request.RefreshToken);

        return result.Tokens is not null ? result.Tokens : Failure(result);
    }

    // Anonymous so an expired access token can still sign out; the refresh token is the proof
    [AllowAnonymous]
    [EnableRateLimiting(AuthConfiguration.TokenRateLimitPolicy)]
    [HttpPost("logout")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> SignOut(RefreshRequest request)
    {
        await accountManager.SignOut(request.RefreshToken);

        return NoContent();
    }

    [HttpGet("me")]
    [ProducesResponseType<AccountModel>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<AccountModel>> GetAccount()
    {
        var account = await accountManager.GetAccount(User.GetUserId());

        // A valid token for a user that no longer exists
        return account is null ? Unauthorized() : account;
    }

    private ObjectResult Failure(AuthResult result) => result.Error switch
    {
        AuthError.EmailTaken => Problem(
            statusCode: StatusCodes.Status409Conflict,
            title: "An account with that email already exists."),
        AuthError.LockedOut => Problem(
            statusCode: StatusCodes.Status423Locked,
            title: "Too many attempts. Try again later.",
            detail: result.LockedOutUntil is { } until ? $"Locked until {until:O}." : null),
        AuthError.InvalidRefreshToken => Problem(
            statusCode: StatusCodes.Status401Unauthorized,
            title: "Session expired. Sign in again."),
        _ => Problem(
            statusCode: StatusCodes.Status401Unauthorized,
            title: "Email or password is incorrect.")
    };
}
