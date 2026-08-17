using FamilyJournalApi.Common;
using FamilyJournalApi.Common.Enum;

namespace FamilyJournalApi.Accessors.Entities;

public class Relationship : IdGeneratedModel
{
    public Guid FamilyId { get; set; }

    public Guid FromProfileId { get; set; }

    public Guid ToProfileId { get; set; }

    public RelationshipType Type { get; set; }

    public Family Family { get; set; } = null!;

    public Profile FromProfile { get; set; } = null!;

    public Profile ToProfile { get; set; } = null!;
}
