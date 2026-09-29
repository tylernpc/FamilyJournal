using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using FamilyJournalApi.Configuration;
using FamilyJournalApi.Engines.Contracts;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace FamilyJournalApi.Engines;

/// <summary>
/// Password hashing and token issuing. The algorithms and their parameters live here and nowhere else.
/// </summary>
public class CredentialEngine(IOptions<JwtOptions> options, TimeProvider timeProvider) : ICredentialEngine
{
    // ASP.NET Core Identity's hasher (PBKDF2, versioned format) without the rest of Identity;
    // the user argument is unused by the default implementation.
    private static readonly PasswordHasher<object> Hasher = new();
    private static readonly object NoUser = new();
    private static readonly string DummyHash = Hasher.HashPassword(NoUser, "not-a-real-password");

    private readonly JwtOptions jwt = options.Value;
    private readonly JsonWebTokenHandler tokenHandler = new();

    public string HashPassword(string password) => Hasher.HashPassword(NoUser, password);

    public PasswordCheck VerifyPassword(string passwordHash, string password) =>
        Hasher.VerifyHashedPassword(NoUser, passwordHash, password) switch
        {
            PasswordVerificationResult.Success => PasswordCheck.Succeeded,
            PasswordVerificationResult.SuccessRehashNeeded => PasswordCheck.SucceededRehashNeeded,
            _ => PasswordCheck.Failed
        };

    public void VerifyAgainstDummy(string password) => Hasher.VerifyHashedPassword(NoUser, DummyHash, password);

    public AccessTokenContract CreateAccessToken(Guid userId, string email, string name)
    {
        var now = timeProvider.GetUtcNow();
        var expiresAt = now.AddMinutes(jwt.AccessTokenMinutes);

        var token = tokenHandler.CreateToken(new SecurityTokenDescriptor
        {
            Issuer = jwt.Issuer,
            Audience = jwt.Audience,
            IssuedAt = now.UtcDateTime,
            NotBefore = now.UtcDateTime,
            Expires = expiresAt.UtcDateTime,
            Subject = new ClaimsIdentity(
            [
                new Claim(JwtRegisteredClaimNames.Sub, userId.ToString()),
                new Claim(JwtRegisteredClaimNames.Email, email),
                new Claim(JwtRegisteredClaimNames.Name, name),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            ]),
            SigningCredentials = new SigningCredentials(SigningKey(jwt), SecurityAlgorithms.HmacSha256)
        });

        return new AccessTokenContract { Token = token, ExpiresAt = expiresAt };
    }

    public RefreshTokenContract CreateRefreshToken()
    {
        var token = Base64UrlEncoder.Encode(RandomNumberGenerator.GetBytes(32));

        return new RefreshTokenContract
        {
            Token = token,
            Hash = HashRefreshToken(token),
            ExpiresAt = timeProvider.GetUtcNow().AddDays(jwt.RefreshTokenDays)
        };
    }

    // Refresh tokens are 256 random bits, so a fast hash is enough; they're never guessable like passwords.
    public string HashRefreshToken(string refreshToken) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(refreshToken)));

    public (string Token, string Hash) CreateInviteToken()
    {
        var token = Base64UrlEncoder.Encode(RandomNumberGenerator.GetBytes(32));

        return (token, HashInviteToken(token));
    }

    // Same reasoning as refresh tokens: random, so a fast hash is enough
    public string HashInviteToken(string inviteToken) => HashRefreshToken(inviteToken);

    public static SymmetricSecurityKey SigningKey(JwtOptions jwt) => new(Encoding.UTF8.GetBytes(jwt.SigningKey));
}
