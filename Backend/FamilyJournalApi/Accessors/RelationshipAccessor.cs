using FamilyJournalApi.Accessors.DTOs;
using FamilyJournalApi.Accessors.Entities;
using FamilyJournalApi.Common.Enum;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace FamilyJournalApi.Accessors;

public class RelationshipAccessor(DatabaseContext db) : IRelationshipAccessor
{
    private static readonly int[] DuplicateKeyErrors = [2601, 2627];

    public async Task<List<RelationshipDto>> GetRelationships(Guid familyId)
    {
        return await db.Relationships
            .AsNoTracking()
            .Where(r => r.FamilyId == familyId)
            .Select(r => new RelationshipDto
            {
                Id = r.Id,
                FromProfileId = r.FromProfileId,
                ToProfileId = r.ToProfileId,
                Type = r.Type,
                Since = r.Since
            })
            .ToListAsync();
    }

    public async Task<RelationshipDto?> AddRelationship(Guid familyId, Guid fromProfileId, Guid toProfileId, RelationshipType type, DateOnly? since)
    {
        // Checked up front so the common case doesn't rely on (and log) a database error
        var exists = await db.Relationships.AnyAsync(r => r.FamilyId == familyId && r.Type == type &&
            ((r.FromProfileId == fromProfileId && r.ToProfileId == toProfileId) ||
             (r.FromProfileId == toProfileId && r.ToProfileId == fromProfileId)));

        if (exists)
        {
            return null;
        }

        var relationship = new Relationship
        {
            FamilyId = familyId,
            FromProfileId = fromProfileId,
            ToProfileId = toProfileId,
            Type = type,
            Since = since
        };

        db.Relationships.Add(relationship);

        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ex.InnerException is SqlException sql && DuplicateKeyErrors.Contains(sql.Number))
        {
            // Two requests raced; UX_Relationships_FamilyId_Pair_Type caught the second
            db.Entry(relationship).State = EntityState.Detached;
            return null;
        }

        return new RelationshipDto
        {
            Id = relationship.Id,
            FromProfileId = fromProfileId,
            ToProfileId = toProfileId,
            Type = type,
            Since = since
        };
    }

    public async Task<RelationshipDto?> GetRelationship(Guid familyId, Guid relationshipId)
    {
        return await db.Relationships
            .AsNoTracking()
            .Where(r => r.FamilyId == familyId && r.Id == relationshipId)
            .Select(r => new RelationshipDto
            {
                Id = r.Id,
                FromProfileId = r.FromProfileId,
                ToProfileId = r.ToProfileId,
                Type = r.Type,
                Since = r.Since
            })
            .SingleOrDefaultAsync();
    }

    public async Task DeleteRelationship(Guid relationshipId)
    {
        await db.Relationships.Where(r => r.Id == relationshipId).ExecuteDeleteAsync();
    }
}
