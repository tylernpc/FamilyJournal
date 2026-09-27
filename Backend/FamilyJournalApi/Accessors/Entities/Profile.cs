using FamilyJournalApi.Common;
using FamilyJournalApi.Common.Enum;

namespace FamilyJournalApi.Accessors.Entities;

public class Profile : IdGeneratedModel
{
    public Guid FamilyId { get; set; }

    public string FirstName { get; set; } = string.Empty;

    public string LastName { get; set; } = string.Empty;

    public string? MaidenName { get; set; }

    public Gender Gender { get; set; }

    // The account that owns this profile; null for placeholders nobody has claimed yet
    public Guid? UserId { get; set; }

    public bool IsPlaceholder { get; set; }

    public LifeStatus LifeStatus { get; set; }

    public DateOnly? BirthDate { get; set; }

    public DateOnly? DeathDate { get; set; }

    public string? Bio { get; set; }

    public string? Location { get; set; }

    public Guid? PhotoMediaId { get; set; }

    // Who created this profile; null for founders and people who joined themselves
    public Guid? AddedByProfileId { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public Family Family { get; set; } = null!;

    public Media? PhotoMedia { get; set; }
}
