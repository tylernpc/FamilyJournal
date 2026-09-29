using System.Security.Claims;
using Microsoft.IdentityModel.JsonWebTokens;

namespace FamilyJournalApi.Controllers;

public static class ClaimsPrincipalExtensions
{
    /// <summary>
    /// The signed-in user's id from the access token's "sub" claim.
    /// Only call from endpoints that require authentication.
    /// </summary>
    public static Guid GetUserId(this ClaimsPrincipal principal) =>
        Guid.Parse(principal.FindFirstValue(JwtRegisteredClaimNames.Sub)
            ?? throw new InvalidOperationException("No signed-in user on this request."));
}
