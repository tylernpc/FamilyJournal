using FamilyJournalApi.Configuration;
using FamilyJournalApi.Engines;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;

namespace FamilyJournalApi.Tests;

public static class TestCredentials
{
    public static readonly DateTimeOffset Start = new(2026, 9, 27, 12, 0, 0, TimeSpan.Zero);

    public static JwtOptions Jwt() => new()
    {
        Issuer = "FamilyJournal.Tests",
        Audience = "FamilyJournal.Tests",
        SigningKey = "test-signing-key-that-is-at-least-32-bytes-long",
        AccessTokenMinutes = 15,
        RefreshTokenDays = 30
    };

    public static CredentialEngine Engine(TimeProvider time) => new(Options.Create(Jwt()), time);

    public static FakeTimeProvider Clock() => new(Start);
}
