using FamilyJournalApi.Common.Enum;

namespace FamilyJournalApi.Accessors.DTOs;

public class FamilyDto
{
    public Guid Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public DateTimeOffset CreatedAt { get; set; }

    public List<FamilyMemberDto> Members { get; set; } = [];
}

public class FamilyMemberDto
{
    public Guid ProfileId { get; set; }

    public string DisplayName { get; set; } = string.Empty;

    public MemberRole Role { get; set; }

    public DateTimeOffset JoinedAt { get; set; }
}
