using FamilyJournalApi.Common.Enum;

namespace FamilyJournalApi.Accessors.DTOs;

public class ProfileDto
{
    public Guid Id { get; set; }

    public Guid FamilyId { get; set; }

    public string FirstName { get; set; } = string.Empty;

    public string LastName { get; set; } = string.Empty;

    public string? MaidenName { get; set; }

    public Gender Gender { get; set; }

    public Guid? UserId { get; set; }

    public bool IsPlaceholder { get; set; }

    public LifeStatus LifeStatus { get; set; }

    public DateOnly? BirthDate { get; set; }

    public DateOnly? DeathDate { get; set; }

    public string? Bio { get; set; }

    public string? Location { get; set; }

    public Guid? PhotoMediaId { get; set; }

    public Guid? AddedByProfileId { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    // Set when the profile belongs to someone with an account
    public MemberRole? Role { get; set; }

    public DateTimeOffset? JoinedAt { get; set; }

    // Most recent pending invite that lets someone claim this profile
    public DateTimeOffset? InviteSentAt { get; set; }
}

/// <summary>
/// The editable parts of a profile.
/// </summary>
public class ProfileFieldsDto
{
    public string FirstName { get; set; } = string.Empty;

    public string LastName { get; set; } = string.Empty;

    public string? MaidenName { get; set; }

    public Gender Gender { get; set; }

    public LifeStatus LifeStatus { get; set; }

    public DateOnly? BirthDate { get; set; }

    public DateOnly? DeathDate { get; set; }

    public string? Bio { get; set; }

    public string? Location { get; set; }

    public Guid? PhotoMediaId { get; set; }
}

public class RelationshipDto
{
    public Guid Id { get; set; }

    public Guid FromProfileId { get; set; }

    public Guid ToProfileId { get; set; }

    public RelationshipType Type { get; set; }

    public DateOnly? Since { get; set; }
}
