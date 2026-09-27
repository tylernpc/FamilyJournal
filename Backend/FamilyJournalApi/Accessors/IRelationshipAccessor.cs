using FamilyJournalApi.Accessors.DTOs;
using FamilyJournalApi.Common.Enum;

namespace FamilyJournalApi.Accessors;

public interface IRelationshipAccessor
{
    Task<List<RelationshipDto>> GetRelationships(Guid familyId);

    /// <summary>
    /// Returns null if the same link already exists in either direction.
    /// </summary>
    Task<RelationshipDto?> AddRelationship(Guid familyId, Guid fromProfileId, Guid toProfileId, RelationshipType type, DateOnly? since);

    Task<RelationshipDto?> GetRelationship(Guid familyId, Guid relationshipId);

    Task DeleteRelationship(Guid relationshipId);
}
