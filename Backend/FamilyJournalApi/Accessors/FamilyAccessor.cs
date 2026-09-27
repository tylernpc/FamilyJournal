using FamilyJournalApi.Accessors.DTOs;
using FamilyJournalApi.Accessors.Entities;
using FamilyJournalApi.Common.Enum;
using Microsoft.EntityFrameworkCore;

namespace FamilyJournalApi.Accessors;

/// <summary>
/// note: accessors are what touches our db, your method should be simple, dumb, and reusable
/// </summary>
public class FamilyAccessor(DatabaseContext db) : IFamilyAccessor
{
    public async Task<FamilyDto> CreateFamily(string name, string founderDisplayName, Guid founderUserId, DateTimeOffset createdAt)
    {
        var family = new Family { Name = name, CreatedAt = createdAt };

        var founder = new Profile
        {
            FamilyId = family.Id,
            DisplayName = founderDisplayName,
            UserId = founderUserId,
            LifeStatus = LifeStatus.Living,
            CreatedAt = createdAt
        };

        var founderMember = new FamilyMember
        {
            FamilyId = family.Id,
            ProfileId = founder.Id,
            Role = MemberRole.Admin,
            JoinedAt = createdAt
        };

        db.Families.Add(family);
        db.Profiles.Add(founder);
        db.FamilyMembers.Add(founderMember);

        // single SaveChanges = single transaction, so a family never exists without its admin
        await db.SaveChangesAsync();

        return new FamilyDto
        {
            Id = family.Id,
            Name = family.Name,
            CreatedAt = family.CreatedAt,
            Members =
            [
                new FamilyMemberDto
                {
                    ProfileId = founder.Id,
                    DisplayName = founder.DisplayName,
                    Role = founderMember.Role,
                    JoinedAt = founderMember.JoinedAt
                }
            ]
        };
    }

    public async Task<FamilyDto?> GetFamily(Guid familyId)
    {
        return await db.Families
            .AsNoTracking()
            .Where(f => f.Id == familyId)
            .Select(f => new FamilyDto
            {
                Id = f.Id,
                Name = f.Name,
                CreatedAt = f.CreatedAt,
                Members = f.Members
                    .OrderBy(m => m.JoinedAt)
                    .Select(m => new FamilyMemberDto
                    {
                        ProfileId = m.ProfileId,
                        DisplayName = m.Profile.DisplayName,
                        Role = m.Role,
                        JoinedAt = m.JoinedAt
                    })
                    .ToList()
            })
            .SingleOrDefaultAsync();
    }

    public async Task<List<UserFamilyDto>> GetFamiliesForUser(Guid userId)
    {
        return await db.FamilyMembers
            .AsNoTracking()
            .Where(m => m.Profile.UserId == userId)
            .OrderBy(m => m.JoinedAt)
            .Select(m => new UserFamilyDto
            {
                FamilyId = m.FamilyId,
                FamilyName = m.Family.Name,
                ProfileId = m.ProfileId,
                Role = m.Role,
                JoinedAt = m.JoinedAt
            })
            .ToListAsync();
    }
}
