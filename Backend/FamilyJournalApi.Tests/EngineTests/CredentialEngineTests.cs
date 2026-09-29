using FamilyJournalApi.Engines;
using FamilyJournalApi.Engines.Contracts;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace FamilyJournalApi.Tests.EngineTests;

public class CredentialEngineTests
{
    private readonly CredentialEngine engine = TestCredentials.Engine(TestCredentials.Clock());

    [Fact]
    public void Hashed_password_verifies_only_with_the_same_password()
    {
        var hash = engine.HashPassword("correct horse battery");

        Assert.NotEqual("correct horse battery", hash);
        Assert.Equal(PasswordCheck.Succeeded, engine.VerifyPassword(hash, "correct horse battery"));
        Assert.Equal(PasswordCheck.Failed, engine.VerifyPassword(hash, "Correct horse battery"));
    }

    [Fact]
    public void Same_password_hashes_differently_each_time()
    {
        Assert.NotEqual(engine.HashPassword("correct horse battery"), engine.HashPassword("correct horse battery"));
    }

    [Fact]
    public async Task Access_token_is_signed_and_carries_the_user()
    {
        var userId = Guid.NewGuid();
        var token = engine.CreateAccessToken(userId, "jane@example.com", "Jane Smith");

        Assert.Equal(TestCredentials.Start.AddMinutes(15), token.ExpiresAt);

        var jwt = TestCredentials.Jwt();
        var result = await new JsonWebTokenHandler().ValidateTokenAsync(token.Token, new TokenValidationParameters
        {
            ValidIssuer = jwt.Issuer,
            ValidAudience = jwt.Audience,
            IssuerSigningKey = CredentialEngine.SigningKey(jwt),
            // The token was issued at the fake clock's time, not now
            ValidateLifetime = false
        });

        Assert.True(result.IsValid);
        Assert.Equal(userId.ToString(), result.Claims[JwtRegisteredClaimNames.Sub]);
        Assert.Equal("jane@example.com", result.Claims[JwtRegisteredClaimNames.Email]);
        Assert.Equal("Jane Smith", result.Claims[JwtRegisteredClaimNames.Name]);
    }

    [Fact]
    public async Task Access_token_signed_with_another_key_is_rejected()
    {
        var token = engine.CreateAccessToken(Guid.NewGuid(), "jane@example.com", "Jane Smith");

        var other = TestCredentials.Jwt();
        other.SigningKey = "a-completely-different-key-also-32-bytes-or-more";

        var result = await new JsonWebTokenHandler().ValidateTokenAsync(token.Token, new TokenValidationParameters
        {
            ValidIssuer = other.Issuer,
            ValidAudience = other.Audience,
            IssuerSigningKey = CredentialEngine.SigningKey(other),
            ValidateLifetime = false
        });

        Assert.False(result.IsValid);
    }

    [Fact]
    public void Refresh_tokens_are_unique_and_only_their_hash_is_kept()
    {
        var first = engine.CreateRefreshToken();
        var second = engine.CreateRefreshToken();

        Assert.NotEqual(first.Token, second.Token);
        Assert.NotEqual(first.Token, first.Hash);
        Assert.Equal(first.Hash, engine.HashRefreshToken(first.Token));
        Assert.Equal(64, first.Hash.Length);
        Assert.Equal(TestCredentials.Start.AddDays(30), first.ExpiresAt);
    }
}
