using FamilyJournalApi.Accessors;
using FamilyJournalApi.Accessors.DTOs;
using FamilyJournalApi.Engines;
using FamilyJournalApi.Engines.Contracts;
using FamilyJournalApi.Managers.Models;

namespace FamilyJournalApi.Managers;

/// <summary>
/// Registration, sign-in, and the refresh-token lifecycle.
/// </summary>
public class AccountManager(
    IUserAccessor userAccessor,
    IFamilyAccessor familyAccessor,
    ICredentialEngine credentialEngine,
    TimeProvider timeProvider) : IAccountManager
{
    public const int MaxFailedSignIns = 5;
    public static readonly TimeSpan LockoutDuration = TimeSpan.FromMinutes(15);

    public async Task<AuthResult> Register(RegisterRequest request)
    {
        var email = request.Email.Trim();

        var user = await userAccessor.CreateUser(
            email,
            NormalizeEmail(email),
            credentialEngine.HashPassword(request.Password),
            request.FirstName.Trim(),
            request.LastName.Trim(),
            timeProvider.GetUtcNow());

        if (user is null)
        {
            return AuthResult.Failure(AuthError.EmailTaken);
        }

        return AuthResult.Success(await StartSession(user));
    }

    public async Task<AuthResult> SignIn(SignInRequest request)
    {
        var now = timeProvider.GetUtcNow();
        var user = await userAccessor.GetUserByEmail(NormalizeEmail(request.Email));

        if (user is null)
        {
            credentialEngine.VerifyAgainstDummy(request.Password);
            return AuthResult.Failure(AuthError.InvalidCredentials);
        }

        if (user.LockoutEndsAt > now)
        {
            return new AuthResult { Error = AuthError.LockedOut, LockedOutUntil = user.LockoutEndsAt };
        }

        var check = credentialEngine.VerifyPassword(user.PasswordHash, request.Password);

        if (check == PasswordCheck.Failed)
        {
            var failures = user.FailedSignInCount + 1;

            if (failures >= MaxFailedSignIns)
            {
                var until = now.Add(LockoutDuration);
                await userAccessor.RecordFailedSignIn(user.Id, 0, until);
                return new AuthResult { Error = AuthError.LockedOut, LockedOutUntil = until };
            }

            await userAccessor.RecordFailedSignIn(user.Id, failures, null);
            return AuthResult.Failure(AuthError.InvalidCredentials);
        }

        var upgradedHash = check == PasswordCheck.SucceededRehashNeeded
            ? credentialEngine.HashPassword(request.Password)
            : null;

        await userAccessor.RecordSignIn(user.Id, now, upgradedHash);

        return AuthResult.Success(await StartSession(user));
    }

    public async Task<AuthResult> Refresh(string refreshToken)
    {
        var now = timeProvider.GetUtcNow();
        var current = await userAccessor.GetRefreshToken(credentialEngine.HashRefreshToken(refreshToken));

        if (current is null)
        {
            return AuthResult.Failure(AuthError.InvalidRefreshToken);
        }

        if (current.RevokedAt is not null)
        {
            // A rotated-out token came back: assume it was stolen and end the session everywhere
            await userAccessor.RevokeRefreshTokenChain(current.ChainId, now);
            return AuthResult.Failure(AuthError.InvalidRefreshToken);
        }

        if (current.ExpiresAt <= now)
        {
            return AuthResult.Failure(AuthError.InvalidRefreshToken);
        }

        var user = await userAccessor.GetUser(current.UserId);

        if (user is null)
        {
            return AuthResult.Failure(AuthError.InvalidRefreshToken);
        }

        var next = credentialEngine.CreateRefreshToken();
        var rotated = await userAccessor.RotateRefreshToken(current.Id, next.Hash, next.ExpiresAt, now);

        if (rotated is null)
        {
            // Another request rotated this token first; same treatment as reuse
            await userAccessor.RevokeRefreshTokenChain(current.ChainId, now);
            return AuthResult.Failure(AuthError.InvalidRefreshToken);
        }

        return AuthResult.Success(Tokens(user, next));
    }

    public async Task SignOut(string refreshToken)
    {
        var token = await userAccessor.GetRefreshToken(credentialEngine.HashRefreshToken(refreshToken));

        if (token is not null)
        {
            await userAccessor.RevokeRefreshTokenChain(token.ChainId, timeProvider.GetUtcNow());
        }
    }

    public async Task<AccountModel?> GetAccount(Guid userId)
    {
        var user = await userAccessor.GetUser(userId);

        if (user is null)
        {
            return null;
        }

        var families = await familyAccessor.GetFamiliesForUser(userId);

        return new AccountModel
        {
            Id = user.Id,
            Email = user.Email,
            FirstName = user.FirstName,
            LastName = user.LastName,
            CreatedAt = user.CreatedAt,
            Families = families
                .Select(m => new UserFamilyModel
                {
                    FamilyId = m.FamilyId,
                    FamilyName = m.FamilyName,
                    ProfileId = m.ProfileId,
                    Role = m.Role,
                    JoinedAt = m.JoinedAt
                })
                .ToList()
        };
    }

    public static string NormalizeEmail(string email) => email.Trim().ToUpperInvariant();

    // A new sign-in starts a new refresh-token chain
    private async Task<AuthTokensModel> StartSession(UserDto user)
    {
        var refresh = credentialEngine.CreateRefreshToken();

        await userAccessor.AddRefreshToken(user.Id, Guid.NewGuid(), refresh.Hash, refresh.ExpiresAt, timeProvider.GetUtcNow());

        return Tokens(user, refresh);
    }

    private AuthTokensModel Tokens(UserDto user, RefreshTokenContract refresh)
    {
        var access = credentialEngine.CreateAccessToken(user.Id, user.Email, $"{user.FirstName} {user.LastName}");

        return new AuthTokensModel
        {
            AccessToken = access.Token,
            AccessTokenExpiresAt = access.ExpiresAt,
            RefreshToken = refresh.Token,
            RefreshTokenExpiresAt = refresh.ExpiresAt
        };
    }
}
