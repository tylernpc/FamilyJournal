using FamilyJournalApi.Accessors.DTOs;

namespace FamilyJournalApi.Accessors;

public interface IUserAccessor
{
    /// <summary>
    /// Returns null when the normalized email is already registered.
    /// </summary>
    Task<UserDto?> CreateUser(string email, string normalizedEmail, string passwordHash, string firstName, string lastName, DateTimeOffset createdAt);

    Task<UserDto?> GetUser(Guid userId);

    Task<UserDto?> GetUserByEmail(string normalizedEmail);

    Task RecordFailedSignIn(Guid userId, int failedSignInCount, DateTimeOffset? lockoutEndsAt);

    /// <summary>
    /// Clears failed attempts and lockout. Pass a new hash when the stored one should be upgraded.
    /// </summary>
    Task RecordSignIn(Guid userId, DateTimeOffset signedInAt, string? upgradedPasswordHash);

    Task<RefreshTokenDto> AddRefreshToken(Guid userId, Guid chainId, string tokenHash, DateTimeOffset expiresAt, DateTimeOffset createdAt);

    Task<RefreshTokenDto?> GetRefreshToken(string tokenHash);

    /// <summary>
    /// Revokes the current token and issues its replacement in the same chain, atomically.
    /// Returns null if the current token was already revoked (someone else used it first).
    /// </summary>
    Task<RefreshTokenDto?> RotateRefreshToken(Guid currentTokenId, string newTokenHash, DateTimeOffset expiresAt, DateTimeOffset rotatedAt);

    Task RevokeRefreshTokenChain(Guid chainId, DateTimeOffset revokedAt);
}
