using FamilyJournalApi.Managers.Models;

namespace FamilyJournalApi.Managers;

public interface IAccountManager
{
    Task<AuthResult> Register(RegisterRequest request);

    Task<AuthResult> SignIn(SignInRequest request);

    /// <summary>
    /// Trades a refresh token for a new access token and a new refresh token.
    /// A token that was already used revokes the whole sign-in session.
    /// </summary>
    Task<AuthResult> Refresh(string refreshToken);

    /// <summary>
    /// Ends the sign-in session the refresh token belongs to. Unknown tokens are ignored.
    /// </summary>
    Task SignOut(string refreshToken);

    Task<AccountModel?> GetAccount(Guid userId);
}
