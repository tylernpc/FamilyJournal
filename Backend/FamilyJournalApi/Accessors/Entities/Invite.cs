using FamilyJournalApi.Common;
using FamilyJournalApi.Common.Enum;

namespace FamilyJournalApi.Accessors.Entities;

public class Invite : IdGeneratedModel
{
    public Guid FamilyId { get; set; }

    // SHA-256 of the token in the invite link; the raw token is never stored
    public string TokenHash { get; set; } = string.Empty;

    public string? Email { get; set; }

    public MemberRole Role { get; set; }

    // The placeholder profile this invite lets someone claim, if any
    public Guid? ProfileId { get; set; }

    public Guid? InvitedByProfileId { get; set; }

    public DateTimeOffset ExpiresAt { get; set; }

    public DateTimeOffset? ClaimedAt { get; set; }

    public DateTimeOffset? RevokedAt { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public Family Family { get; set; } = null!;
}
