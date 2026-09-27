namespace FamilyJournalApi.Configuration;

/// <summary>
/// Bound from the "Jwt" section. SigningKey comes from the environment (Jwt__SigningKey in .env), never appsettings.
/// </summary>
public class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Issuer { get; set; } = string.Empty;

    public string Audience { get; set; } = string.Empty;

    // HMAC-SHA256 key; at least 32 bytes
    public string SigningKey { get; set; } = string.Empty;

    public int AccessTokenMinutes { get; set; } = 15;

    // Sliding: each refresh issues a token good for this many more days
    public int RefreshTokenDays { get; set; } = 30;
}
