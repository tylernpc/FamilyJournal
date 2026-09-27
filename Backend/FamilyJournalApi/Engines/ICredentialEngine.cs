using FamilyJournalApi.Engines.Contracts;

namespace FamilyJournalApi.Engines;

public interface ICredentialEngine
{
    string HashPassword(string password);

    PasswordCheck VerifyPassword(string passwordHash, string password);

    /// <summary>
    /// Burns the same time as a real check, so unknown emails can't be told apart by response time.
    /// </summary>
    void VerifyAgainstDummy(string password);

    AccessTokenContract CreateAccessToken(Guid userId, string email, string name);

    RefreshTokenContract CreateRefreshToken();

    string HashRefreshToken(string refreshToken);
}
