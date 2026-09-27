using FamilyJournalApi.Common;
using FamilyJournalApi.Common.Enum;

namespace FamilyJournalApi.Accessors.Entities;

public class Profile : IdGeneratedModel
{
    public Guid FamilyId { get; set; }

    public string DisplayName { get; set; } = string.Empty;

    // The account that owns this profile; null for placeholders nobody has claimed yet
    public Guid? UserId { get; set; }

    public bool IsPlaceholder { get; set; }

    public LifeStatus LifeStatus { get; set; }

    public DateTimeOffset? BirthDate { get; set; }

    public DateTimeOffset? DeathDate { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public Family Family { get; set; } = null!;
}
