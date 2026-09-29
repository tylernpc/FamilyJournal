using FamilyJournalApi.Common;

namespace FamilyJournalApi.Accessors.Entities;

public class RefreshToken : IdGeneratedModel
{
    public Guid UserId { get; set; }

    // Shared by every token rotated from the same sign-in
    public Guid ChainId { get; set; }

    // SHA-256 of the raw token, hex; the raw value is never stored
    public string TokenHash { get; set; } = string.Empty;

    public DateTimeOffset ExpiresAt { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset? RevokedAt { get; set; }

    public Guid? ReplacedByTokenId { get; set; }

    public User User { get; set; } = null!;
}
