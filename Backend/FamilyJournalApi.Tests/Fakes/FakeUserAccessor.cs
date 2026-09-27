using FamilyJournalApi.Accessors;
using FamilyJournalApi.Accessors.DTOs;

namespace FamilyJournalApi.Tests.Fakes;

/// <summary>
/// In-memory IUserAccessor with the same observable behavior as the SQL one:
/// unique normalized emails and single-winner refresh token rotation.
/// </summary>
public class FakeUserAccessor : IUserAccessor
{
    public Dictionary<Guid, UserDto> Users { get; } = [];

    public Dictionary<string, StoredToken> Tokens { get; } = [];

    public class StoredToken
    {
        public RefreshTokenDto Token { get; init; } = null!;

        public string Hash { get; init; } = string.Empty;

        public Guid? ReplacedByTokenId { get; set; }
    }

    private readonly Dictionary<Guid, string> normalizedEmails = [];

    public Task<UserDto?> CreateUser(string email, string normalizedEmail, string passwordHash, string firstName, string lastName, DateTimeOffset createdAt)
    {
        if (normalizedEmails.ContainsValue(normalizedEmail))
        {
            return Task.FromResult<UserDto?>(null);
        }

        var user = new UserDto
        {
            Id = Guid.NewGuid(),
            Email = email,
            PasswordHash = passwordHash,
            FirstName = firstName,
            LastName = lastName,
            CreatedAt = createdAt
        };

        Users[user.Id] = user;
        normalizedEmails[user.Id] = normalizedEmail;

        return Task.FromResult<UserDto?>(Copy(user));
    }

    public Task<UserDto?> GetUser(Guid userId) =>
        Task.FromResult(Users.TryGetValue(userId, out var user) ? Copy(user) : null);

    public Task<UserDto?> GetUserByEmail(string normalizedEmail)
    {
        var id = normalizedEmails.FirstOrDefault(e => e.Value == normalizedEmail).Key;

        return Task.FromResult(Users.TryGetValue(id, out var user) ? Copy(user) : null);
    }

    public Task RecordFailedSignIn(Guid userId, int failedSignInCount, DateTimeOffset? lockoutEndsAt)
    {
        Users[userId].FailedSignInCount = failedSignInCount;
        Users[userId].LockoutEndsAt = lockoutEndsAt;

        return Task.CompletedTask;
    }

    public Task RecordSignIn(Guid userId, DateTimeOffset signedInAt, string? upgradedPasswordHash)
    {
        var user = Users[userId];
        user.FailedSignInCount = 0;
        user.LockoutEndsAt = null;
        user.LastSignInAt = signedInAt;
        user.PasswordHash = upgradedPasswordHash ?? user.PasswordHash;

        return Task.CompletedTask;
    }

    public Task<RefreshTokenDto> AddRefreshToken(Guid userId, Guid chainId, string tokenHash, DateTimeOffset expiresAt, DateTimeOffset createdAt)
    {
        var token = new RefreshTokenDto
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            ChainId = chainId,
            ExpiresAt = expiresAt
        };

        Tokens[tokenHash] = new StoredToken { Token = token, Hash = tokenHash };

        return Task.FromResult(CopyToken(token));
    }

    public Task<RefreshTokenDto?> GetRefreshToken(string tokenHash) =>
        Task.FromResult(Tokens.TryGetValue(tokenHash, out var stored) ? CopyToken(stored.Token) : null);

    public async Task<RefreshTokenDto?> RotateRefreshToken(Guid currentTokenId, string newTokenHash, DateTimeOffset expiresAt, DateTimeOffset rotatedAt)
    {
        var current = Tokens.Values.Single(t => t.Token.Id == currentTokenId);

        if (current.Token.RevokedAt is not null)
        {
            return null;
        }

        current.Token.RevokedAt = rotatedAt;

        var replacement = await AddRefreshToken(current.Token.UserId, current.Token.ChainId, newTokenHash, expiresAt, rotatedAt);
        current.ReplacedByTokenId = replacement.Id;

        return replacement;
    }

    public Task RevokeRefreshTokenChain(Guid chainId, DateTimeOffset revokedAt)
    {
        foreach (var stored in Tokens.Values.Where(t => t.Token.ChainId == chainId && t.Token.RevokedAt is null))
        {
            stored.Token.RevokedAt = revokedAt;
        }

        return Task.CompletedTask;
    }

    // Callers get copies, like rows read from a database
    private static UserDto Copy(UserDto user) => new()
    {
        Id = user.Id,
        Email = user.Email,
        PasswordHash = user.PasswordHash,
        FirstName = user.FirstName,
        LastName = user.LastName,
        FailedSignInCount = user.FailedSignInCount,
        LockoutEndsAt = user.LockoutEndsAt,
        LastSignInAt = user.LastSignInAt,
        CreatedAt = user.CreatedAt
    };

    private static RefreshTokenDto CopyToken(RefreshTokenDto token) => new()
    {
        Id = token.Id,
        UserId = token.UserId,
        ChainId = token.ChainId,
        ExpiresAt = token.ExpiresAt,
        RevokedAt = token.RevokedAt
    };
}
