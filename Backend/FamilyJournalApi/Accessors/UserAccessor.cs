using FamilyJournalApi.Accessors.DTOs;
using FamilyJournalApi.Accessors.Entities;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace FamilyJournalApi.Accessors;

public class UserAccessor(DatabaseContext db) : IUserAccessor
{
    // SQL Server duplicate-key errors: unique index (2601) and unique constraint (2627)
    private static readonly int[] DuplicateKeyErrors = [2601, 2627];

    public async Task<UserDto?> CreateUser(string email, string normalizedEmail, string passwordHash, string firstName, string lastName, DateTimeOffset createdAt)
    {
        if (await db.Users.AnyAsync(u => u.NormalizedEmail == normalizedEmail))
        {
            return null;
        }

        var user = new User
        {
            Email = email,
            NormalizedEmail = normalizedEmail,
            PasswordHash = passwordHash,
            FirstName = firstName,
            LastName = lastName,
            CreatedAt = createdAt
        };

        db.Users.Add(user);

        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ex.InnerException is SqlException sql && DuplicateKeyErrors.Contains(sql.Number))
        {
            // lost a race with another registration for the same email
            db.Entry(user).State = EntityState.Detached;
            return null;
        }

        return ToDto(user);
    }

    public async Task<UserDto?> GetUser(Guid userId)
    {
        var user = await db.Users.AsNoTracking().SingleOrDefaultAsync(u => u.Id == userId);

        return user is null ? null : ToDto(user);
    }

    public async Task<UserDto?> GetUserByEmail(string normalizedEmail)
    {
        var user = await db.Users.AsNoTracking().SingleOrDefaultAsync(u => u.NormalizedEmail == normalizedEmail);

        return user is null ? null : ToDto(user);
    }

    public async Task RecordFailedSignIn(Guid userId, int failedSignInCount, DateTimeOffset? lockoutEndsAt)
    {
        await db.Users
            .Where(u => u.Id == userId)
            .ExecuteUpdateAsync(set => set
                .SetProperty(u => u.FailedSignInCount, failedSignInCount)
                .SetProperty(u => u.LockoutEndsAt, lockoutEndsAt));
    }

    public async Task RecordSignIn(Guid userId, DateTimeOffset signedInAt, string? upgradedPasswordHash)
    {
        var user = await db.Users.SingleAsync(u => u.Id == userId);

        user.FailedSignInCount = 0;
        user.LockoutEndsAt = null;
        user.LastSignInAt = signedInAt;

        if (upgradedPasswordHash is not null)
        {
            user.PasswordHash = upgradedPasswordHash;
        }

        await db.SaveChangesAsync();
    }

    public async Task<RefreshTokenDto> AddRefreshToken(Guid userId, Guid chainId, string tokenHash, DateTimeOffset expiresAt, DateTimeOffset createdAt)
    {
        var token = new RefreshToken
        {
            UserId = userId,
            ChainId = chainId,
            TokenHash = tokenHash,
            ExpiresAt = expiresAt,
            CreatedAt = createdAt
        };

        db.RefreshTokens.Add(token);
        await db.SaveChangesAsync();

        return ToDto(token);
    }

    public async Task<RefreshTokenDto?> GetRefreshToken(string tokenHash)
    {
        var token = await db.RefreshTokens.AsNoTracking().SingleOrDefaultAsync(t => t.TokenHash == tokenHash);

        return token is null ? null : ToDto(token);
    }

    public async Task<RefreshTokenDto?> RotateRefreshToken(Guid currentTokenId, string newTokenHash, DateTimeOffset expiresAt, DateTimeOffset rotatedAt)
    {
        await using var transaction = await db.Database.BeginTransactionAsync();

        var current = await db.RefreshTokens.AsNoTracking().SingleAsync(t => t.Id == currentTokenId);

        var replacement = new RefreshToken
        {
            UserId = current.UserId,
            ChainId = current.ChainId,
            TokenHash = newTokenHash,
            ExpiresAt = expiresAt,
            CreatedAt = rotatedAt
        };

        // The RevokedAt == null condition makes this the one winner if two requests rotate the same token at once
        var revoked = await db.RefreshTokens
            .Where(t => t.Id == currentTokenId && t.RevokedAt == null)
            .ExecuteUpdateAsync(set => set
                .SetProperty(t => t.RevokedAt, rotatedAt)
                .SetProperty(t => t.ReplacedByTokenId, replacement.Id));

        if (revoked == 0)
        {
            return null;
        }

        db.RefreshTokens.Add(replacement);
        await db.SaveChangesAsync();
        await transaction.CommitAsync();

        return ToDto(replacement);
    }

    public async Task RevokeRefreshTokenChain(Guid chainId, DateTimeOffset revokedAt)
    {
        await db.RefreshTokens
            .Where(t => t.ChainId == chainId && t.RevokedAt == null)
            .ExecuteUpdateAsync(set => set.SetProperty(t => t.RevokedAt, revokedAt));
    }

    private static UserDto ToDto(User user) => new()
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

    private static RefreshTokenDto ToDto(RefreshToken token) => new()
    {
        Id = token.Id,
        UserId = token.UserId,
        ChainId = token.ChainId,
        ExpiresAt = token.ExpiresAt,
        RevokedAt = token.RevokedAt
    };
}
