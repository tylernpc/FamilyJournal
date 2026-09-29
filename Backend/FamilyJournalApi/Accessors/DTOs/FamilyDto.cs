using FamilyJournalApi.Common.Enum;

namespace FamilyJournalApi.Accessors.DTOs;

public class FamilyDto
{
    public Guid Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public DateTimeOffset CreatedAt { get; set; }

    public List<FamilyMemberDto> Members { get; set; } = [];
}

/// <summary>
/// Someone with an account in the family, through their profile.
/// </summary>
public class FamilyMemberDto
{
    public Guid ProfileId { get; set; }

    public Guid? UserId { get; set; }

    public string FirstName { get; set; } = string.Empty;

    public string LastName { get; set; } = string.Empty;

    public MemberRole Role { get; set; }

    public DateTimeOffset JoinedAt { get; set; }
}

public class InviteDto
{
    public Guid Id { get; set; }

    public Guid FamilyId { get; set; }

    public string? Email { get; set; }

    public MemberRole Role { get; set; }

    public Guid? ProfileId { get; set; }

    public Guid? InvitedByProfileId { get; set; }

    public DateTimeOffset ExpiresAt { get; set; }

    public DateTimeOffset? ClaimedAt { get; set; }

    public DateTimeOffset? RevokedAt { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
}

/// <summary>
/// How someone joins: by claiming an existing placeholder, or with a new profile under these names.
/// </summary>
public class JoinDto
{
    public Guid InviteId { get; set; }

    public Guid FamilyId { get; set; }

    public Guid UserId { get; set; }

    public MemberRole Role { get; set; }

    public Guid? ClaimProfileId { get; set; }

    public string NewFirstName { get; set; } = string.Empty;

    public string NewLastName { get; set; } = string.Empty;

    public DateTimeOffset JoinedAt { get; set; }
}
