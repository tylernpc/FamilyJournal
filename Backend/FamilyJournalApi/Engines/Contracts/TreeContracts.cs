using FamilyJournalApi.Common.Enum;

namespace FamilyJournalApi.Engines.Contracts;

public record RelationshipLink(Guid FromProfileId, Guid ToProfileId, RelationshipType Type);

public class TreeContract
{
    public List<TreeNodeContract> Nodes { get; set; } = [];

    public int Generations { get; set; }
}

public class TreeNodeContract
{
    public Guid ProfileId { get; set; }

    // 0 is the oldest generation in the family
    public int Generation { get; set; }

    public List<Guid> ParentIds { get; set; } = [];

    public List<Guid> ChildIds { get; set; } = [];

    public List<Guid> SpouseIds { get; set; } = [];

    // Share at least one parent; derived, never stored
    public List<Guid> SiblingIds { get; set; } = [];
}

public enum RelationshipCheck
{
    Ok,

    // Linking someone to themselves
    SameProfile,

    // The child already has two parents
    TooManyParents,

    // The would-be child is already an ancestor of the would-be parent
    AncestryLoop,

    // Spouses who are parent and child of each other, or the reverse
    ConflictsWithExisting
}
