using FamilyJournalApi.Accessors.DTOs;
using FamilyJournalApi.Accessors.Entities;
using Microsoft.EntityFrameworkCore;

namespace FamilyJournalApi.Accessors;

public class ProfileAccessor(DatabaseContext db) : IProfileAccessor
{
    public async Task<List<ProfileDto>> GetProfiles(Guid familyId, DateTimeOffset now)
    {
        return await Profiles(familyId, now)
            .OrderBy(p => p.BirthDate == null)
            .ThenBy(p => p.BirthDate)
            .ThenBy(p => p.FirstName)
            .ToListAsync();
    }

    public async Task<ProfileDto?> GetProfile(Guid familyId, Guid profileId, DateTimeOffset now)
    {
        return await Profiles(familyId, now).SingleOrDefaultAsync(p => p.Id == profileId);
    }

    public async Task<HashSet<Guid>> FindProfilesInFamily(Guid familyId, IEnumerable<Guid> profileIds)
    {
        var ids = profileIds.Distinct().ToList();

        var found = await db.Profiles
            .Where(p => p.FamilyId == familyId && ids.Contains(p.Id))
            .Select(p => p.Id)
            .ToListAsync();

        return found.ToHashSet();
    }

    public async Task<Guid> CreatePlaceholder(Guid familyId, ProfileFieldsDto fields, Guid addedByProfileId, DateTimeOffset createdAt)
    {
        var profile = new Profile
        {
            FamilyId = familyId,
            IsPlaceholder = true,
            AddedByProfileId = addedByProfileId,
            CreatedAt = createdAt
        };
        Apply(profile, fields);

        db.Profiles.Add(profile);
        await db.SaveChangesAsync();

        return profile.Id;
    }

    public async Task UpdateProfile(Guid profileId, ProfileFieldsDto fields)
    {
        var profile = await db.Profiles.SingleAsync(p => p.Id == profileId);
        Apply(profile, fields);

        await db.SaveChangesAsync();
    }

    public async Task DeletePlaceholder(Guid profileId)
    {
        await using var transaction = await db.Database.BeginTransactionAsync();

        await db.Relationships.Where(r => r.FromProfileId == profileId || r.ToProfileId == profileId).ExecuteDeleteAsync();
        await db.PostTags.Where(t => t.ProfileId == profileId).ExecuteDeleteAsync();
        await db.CommentMentions.Where(m => m.ProfileId == profileId).ExecuteDeleteAsync();
        await db.Invites.Where(i => i.ProfileId == profileId).ExecuteDeleteAsync();

        // Profiles this one added keep existing; they just lose the "added by"
        await db.Profiles
            .Where(p => p.AddedByProfileId == profileId)
            .ExecuteUpdateAsync(set => set.SetProperty(p => p.AddedByProfileId, (Guid?)null));

        await db.Profiles.Where(p => p.Id == profileId && p.UserId == null).ExecuteDeleteAsync();

        await transaction.CommitAsync();
    }

    private IQueryable<ProfileDto> Profiles(Guid familyId, DateTimeOffset now) =>
        db.Profiles
            .AsNoTracking()
            .Where(p => p.FamilyId == familyId)
            .Select(p => new ProfileDto
            {
                Id = p.Id,
                FamilyId = p.FamilyId,
                FirstName = p.FirstName,
                LastName = p.LastName,
                MaidenName = p.MaidenName,
                Gender = p.Gender,
                UserId = p.UserId,
                IsPlaceholder = p.UserId == null,
                LifeStatus = p.LifeStatus,
                BirthDate = p.BirthDate,
                DeathDate = p.DeathDate,
                Bio = p.Bio,
                Location = p.Location,
                PhotoMediaId = p.PhotoMediaId,
                AddedByProfileId = p.AddedByProfileId,
                CreatedAt = p.CreatedAt,
                Role = db.FamilyMembers
                    .Where(m => m.FamilyId == familyId && m.ProfileId == p.Id)
                    .Select(m => (Common.Enum.MemberRole?)m.Role)
                    .FirstOrDefault(),
                JoinedAt = db.FamilyMembers
                    .Where(m => m.FamilyId == familyId && m.ProfileId == p.Id)
                    .Select(m => (DateTimeOffset?)m.JoinedAt)
                    .FirstOrDefault(),
                InviteSentAt = db.Invites
                    .Where(i => i.ProfileId == p.Id && i.ClaimedAt == null && i.RevokedAt == null && i.ExpiresAt > now)
                    .OrderByDescending(i => i.CreatedAt)
                    .Select(i => (DateTimeOffset?)i.CreatedAt)
                    .FirstOrDefault()
            });

    private static void Apply(Profile profile, ProfileFieldsDto fields)
    {
        profile.FirstName = fields.FirstName;
        profile.LastName = fields.LastName;
        profile.MaidenName = fields.MaidenName;
        profile.Gender = fields.Gender;
        profile.LifeStatus = fields.LifeStatus;
        profile.BirthDate = fields.BirthDate;
        profile.DeathDate = fields.DeathDate;
        profile.Bio = fields.Bio;
        profile.Location = fields.Location;
        profile.PhotoMediaId = fields.PhotoMediaId;
    }
}
