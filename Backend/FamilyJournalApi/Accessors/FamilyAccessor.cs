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
    public async Task<FamilyDto> CreateFamily(string name, string founderFirstName, string founderLastName, Guid founderUserId, DateTimeOffset createdAt)
    {
        var family = new Family { Name = name, CreatedAt = createdAt };

        var founder = new Profile
        {
            FamilyId = family.Id,
            FirstName = founderFirstName,
            LastName = founderLastName,
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
                    UserId = founderUserId,
                    FirstName = founder.FirstName,
                    LastName = founder.LastName,
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
                        UserId = m.Profile.UserId,
                        FirstName = m.Profile.FirstName,
                        LastName = m.Profile.LastName,
                        Role = m.Role,
                        JoinedAt = m.JoinedAt
                    })
                    .ToList()
            })
            .SingleOrDefaultAsync();
    }

    public async Task RenameFamily(Guid familyId, string name)
    {
        await db.Families
            .Where(f => f.Id == familyId)
            .ExecuteUpdateAsync(set => set.SetProperty(f => f.Name, name));
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

    public async Task<FamilyMemberDto?> GetMemberByUser(Guid familyId, Guid userId)
    {
        return await Members(familyId).SingleOrDefaultAsync(m => m.UserId == userId);
    }

    public async Task<FamilyMemberDto?> GetMemberByProfile(Guid familyId, Guid profileId)
    {
        return await Members(familyId).SingleOrDefaultAsync(m => m.ProfileId == profileId);
    }

    public async Task<List<FamilyMemberDto>> GetMembers(Guid familyId)
    {
        return await Members(familyId).OrderBy(m => m.JoinedAt).ToListAsync();
    }

    public async Task SetMemberRole(Guid familyId, Guid profileId, MemberRole role)
    {
        await db.FamilyMembers
            .Where(m => m.FamilyId == familyId && m.ProfileId == profileId)
            .ExecuteUpdateAsync(set => set.SetProperty(m => m.Role, role));
    }

    public async Task<InviteDto> CreateInvite(Guid familyId, string tokenHash, string? email, MemberRole role, Guid? profileId, Guid invitedByProfileId, DateTimeOffset expiresAt, DateTimeOffset createdAt)
    {
        var invite = new Invite
        {
            FamilyId = familyId,
            TokenHash = tokenHash,
            Email = email,
            Role = role,
            ProfileId = profileId,
            InvitedByProfileId = invitedByProfileId,
            ExpiresAt = expiresAt,
            CreatedAt = createdAt
        };

        db.Invites.Add(invite);
        await db.SaveChangesAsync();

        return ToDto(invite);
    }

    public async Task<List<InviteDto>> GetPendingInvites(Guid familyId, DateTimeOffset now)
    {
        var invites = await db.Invites
            .AsNoTracking()
            .Where(i => i.FamilyId == familyId && i.ClaimedAt == null && i.RevokedAt == null && i.ExpiresAt > now)
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync();

        return invites.Select(ToDto).ToList();
    }

    public async Task<InviteDto?> GetInvite(Guid familyId, Guid inviteId)
    {
        var invite = await db.Invites.AsNoTracking().SingleOrDefaultAsync(i => i.Id == inviteId && i.FamilyId == familyId);

        return invite is null ? null : ToDto(invite);
    }

    public async Task<InviteDto?> GetInviteByTokenHash(string tokenHash)
    {
        var invite = await db.Invites.AsNoTracking().SingleOrDefaultAsync(i => i.TokenHash == tokenHash);

        return invite is null ? null : ToDto(invite);
    }

    public async Task ReissueInvite(Guid inviteId, string tokenHash, DateTimeOffset expiresAt)
    {
        await db.Invites
            .Where(i => i.Id == inviteId)
            .ExecuteUpdateAsync(set => set
                .SetProperty(i => i.TokenHash, tokenHash)
                .SetProperty(i => i.ExpiresAt, expiresAt));
    }

    public async Task RevokeInvite(Guid inviteId, DateTimeOffset revokedAt)
    {
        await db.Invites
            .Where(i => i.Id == inviteId && i.RevokedAt == null)
            .ExecuteUpdateAsync(set => set.SetProperty(i => i.RevokedAt, revokedAt));
    }

    public async Task<Guid?> Join(JoinDto join)
    {
        await using var transaction = await db.Database.BeginTransactionAsync();

        // Claim the invite first; the null checks make exactly one request win
        var claimed = await db.Invites
            .Where(i => i.Id == join.InviteId && i.ClaimedAt == null && i.RevokedAt == null)
            .ExecuteUpdateAsync(set => set.SetProperty(i => i.ClaimedAt, join.JoinedAt));

        if (claimed == 0)
        {
            return null;
        }

        Guid profileId;

        if (join.ClaimProfileId is { } claimProfileId)
        {
            var taken = await db.Profiles
                .Where(p => p.Id == claimProfileId && p.FamilyId == join.FamilyId && p.UserId == null)
                .ExecuteUpdateAsync(set => set
                    .SetProperty(p => p.UserId, join.UserId)
                    .SetProperty(p => p.IsPlaceholder, false));

            if (taken == 0)
            {
                return null;
            }

            // Any other open invites for this profile can no longer be used, so they shouldn't show as pending
            await db.Invites
                .Where(i => i.ProfileId == claimProfileId && i.Id != join.InviteId && i.ClaimedAt == null && i.RevokedAt == null)
                .ExecuteUpdateAsync(set => set.SetProperty(i => i.RevokedAt, join.JoinedAt));

            profileId = claimProfileId;
        }
        else
        {
            var profile = new Profile
            {
                FamilyId = join.FamilyId,
                FirstName = join.NewFirstName,
                LastName = join.NewLastName,
                UserId = join.UserId,
                LifeStatus = LifeStatus.Living,
                CreatedAt = join.JoinedAt
            };

            db.Profiles.Add(profile);
            profileId = profile.Id;
        }

        db.FamilyMembers.Add(new FamilyMember
        {
            FamilyId = join.FamilyId,
            ProfileId = profileId,
            Role = join.Role,
            JoinedAt = join.JoinedAt
        });

        await db.SaveChangesAsync();
        await transaction.CommitAsync();

        return profileId;
    }

    private IQueryable<FamilyMemberDto> Members(Guid familyId) =>
        db.FamilyMembers
            .AsNoTracking()
            .Where(m => m.FamilyId == familyId)
            .Select(m => new FamilyMemberDto
            {
                ProfileId = m.ProfileId,
                UserId = m.Profile.UserId,
                FirstName = m.Profile.FirstName,
                LastName = m.Profile.LastName,
                Role = m.Role,
                JoinedAt = m.JoinedAt
            });

    private static InviteDto ToDto(Invite invite) => new()
    {
        Id = invite.Id,
        FamilyId = invite.FamilyId,
        Email = invite.Email,
        Role = invite.Role,
        ProfileId = invite.ProfileId,
        InvitedByProfileId = invite.InvitedByProfileId,
        ExpiresAt = invite.ExpiresAt,
        ClaimedAt = invite.ClaimedAt,
        RevokedAt = invite.RevokedAt,
        CreatedAt = invite.CreatedAt
    };
}
