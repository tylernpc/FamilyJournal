using FamilyJournalApi.Common;
using FamilyJournalApi.Common.Enum;

namespace FamilyJournalApi.Accessors.Entities;

public class Invite : IdGeneratedModel
{
    public Guid FamilyId { get; set; }

    public string Token { get; set; }

    public string? Email { get; set; }

    public MemberRole Role { get; set; }

    public DateTimeOffset ExpiresAt { get; set; }

    public DateTimeOffset? ClaimedAt { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public Family Family { get; set; }
}
