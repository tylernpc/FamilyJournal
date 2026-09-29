using FamilyJournalApi.Common;

namespace FamilyJournalApi.Accessors.Entities;

public class User : IdGeneratedModel
{
    public string Email { get; set; } = string.Empty;

    // Upper-invariant, trimmed email; unique, used for lookups
    public string NormalizedEmail { get; set; } = string.Empty;

    public string PasswordHash { get; set; } = string.Empty;

    public string FirstName { get; set; } = string.Empty;

    public string LastName { get; set; } = string.Empty;

    public int FailedSignInCount { get; set; }

    public DateTimeOffset? LockoutEndsAt { get; set; }

    public DateTimeOffset? LastSignInAt { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
}
