using FamilyJournalApi.Common.Enum;

namespace FamilyJournalApi.Accessors.Entities;

/// <summary>
/// A signed-up person's access to a family, through their profile in it. Placeholders have no row here.
/// </summary>
public class FamilyMember
{
    public Guid FamilyId { get; set; }

    public Guid ProfileId { get; set; }

    public MemberRole Role { get; set; }

    public DateTimeOffset JoinedAt { get; set; }

    public Family Family { get; set; } = null!;

    public Profile Profile { get; set; } = null!;
}
