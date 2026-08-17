using FamilyJournalApi.Common.Enum;

namespace FamilyJournalApi.Accessors.Entities;

public class FamilyMember
{
    public Guid FamilyId { get; set; }

    public Guid ProfileId { get; set; }

    public MemberRole Role { get; set; }

    public DateTimeOffset JoinedAt { get; set; }

    public Family Family { get; set; }

    public Profile Profile { get; set; }
}
