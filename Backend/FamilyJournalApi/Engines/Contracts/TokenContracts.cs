namespace FamilyJournalApi.Engines.Contracts;

public class AccessTokenContract
{
    public string Token { get; set; } = string.Empty;

    public DateTimeOffset ExpiresAt { get; set; }
}

public class RefreshTokenContract
{
    // Handed to the client once; never stored
    public string Token { get; set; } = string.Empty;

    // What gets stored and looked up
    public string Hash { get; set; } = string.Empty;

    public DateTimeOffset ExpiresAt { get; set; }
}

public enum PasswordCheck
{
    Failed,
    Succeeded,

    // Correct, but hashed with older parameters; store a fresh hash
    SucceededRehashNeeded
}
