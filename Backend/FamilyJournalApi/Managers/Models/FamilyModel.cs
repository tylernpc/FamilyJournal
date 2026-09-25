using FamilyJournalApi.Common.Enum;

namespace FamilyJournalApi.Managers.Models;

public class FamilyModel
{
    public Guid Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public DateTimeOffset CreatedAt { get; set; }

    public List<FamilyMemberModel> Members { get; set; } = [];
}

public class FamilyMemberModel
{
    public Guid ProfileId { get; set; }

    public string DisplayName { get; set; } = string.Empty;

    public MemberRole Role { get; set; }

    public DateTimeOffset JoinedAt { get; set; }
}
