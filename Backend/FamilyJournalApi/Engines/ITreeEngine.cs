using FamilyJournalApi.Common.Enum;
using FamilyJournalApi.Engines.Contracts;

namespace FamilyJournalApi.Engines;

public interface ITreeEngine
{
    /// <summary>
    /// Derives the tree from relationship rows: generations, parents, children, spouses and inferred siblings.
    /// </summary>
    TreeContract Build(IReadOnlyCollection<Guid> profileIds, IReadOnlyCollection<RelationshipLink> links);

    /// <summary>
    /// Whether a new link keeps the tree sensible. Duplicates are left to the database's unique index.
    /// </summary>
    RelationshipCheck CheckNewLink(IReadOnlyCollection<RelationshipLink> existing, Guid fromProfileId, Guid toProfileId, RelationshipType type);
}
