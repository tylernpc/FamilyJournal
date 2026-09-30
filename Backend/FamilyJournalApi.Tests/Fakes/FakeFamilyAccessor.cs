using FamilyJournalApi.Accessors;
using FamilyJournalApi.Accessors.DTOs;
using FamilyJournalApi.Common.Enum;

namespace FamilyJournalApi.Tests.Fakes;

/// <summary>
/// In-memory families, members and invites, sharing profiles with FakeProfileAccessor through FakeDatabase.
/// </summary>
public class FakeFamilyAccessor(FakeDatabase db) : IFamilyAccessor
{
    // Kept for AccountManager tests that seed families directly
    public Dictionary<Guid, List<UserFamilyDto>> FamiliesByUser { get; } = [];

    public Task<FamilyDto> CreateFamily(string name, string founderFirstName, string founderLastName, Guid founderUserId, DateTimeOffset createdAt)
    {
        var familyId = Guid.NewGuid();
        db.Families[familyId] = name;

        var founder = db.AddProfile(familyId, founderFirstName, founderLastName, userId: founderUserId, createdAt: createdAt);
        db.Members.Add(new FakeDatabase.Member(familyId, founder.Id, MemberRole.Admin, createdAt));

        return Task.FromResult(db.Family(familyId)!);
    }

    public Task<FamilyDto?> GetFamily(Guid familyId) => Task.FromResult(db.Family(familyId));

    public Task RenameFamily(Guid familyId, string name)
    {
        db.Families[familyId] = name;
        return Task.CompletedTask;
    }

    public Task<List<UserFamilyDto>> GetFamiliesForUser(Guid userId)
    {
        if (FamiliesByUser.TryGetValue(userId, out var seeded))
        {
            return Task.FromResult(seeded);
        }

        var families = db.Members
            .Select(m => (Member: m, Profile: db.Profiles[m.ProfileId]))
            .Where(x => x.Profile.UserId == userId)
            .Select(x => new UserFamilyDto
            {
                FamilyId = x.Member.FamilyId,
                FamilyName = db.Families[x.Member.FamilyId],
                ProfileId = x.Member.ProfileId,
                Role = x.Member.Role,
                JoinedAt = x.Member.JoinedAt
            })
            .ToList();

        return Task.FromResult(families);
    }

    public Task<FamilyMemberDto?> GetMemberByUser(Guid familyId, Guid userId) =>
        Task.FromResult(db.MembersOf(familyId).SingleOrDefault(m => m.UserId == userId));

    public Task<FamilyMemberDto?> GetMemberByProfile(Guid familyId, Guid profileId) =>
        Task.FromResult(db.MembersOf(familyId).SingleOrDefault(m => m.ProfileId == profileId));

    public Task<List<FamilyMemberDto>> GetMembers(Guid familyId) => Task.FromResult(db.MembersOf(familyId));

    public Task SetMemberRole(Guid familyId, Guid profileId, MemberRole role)
    {
        var index = db.Members.FindIndex(m => m.FamilyId == familyId && m.ProfileId == profileId);
        db.Members[index] = db.Members[index] with { Role = role };
        return Task.CompletedTask;
    }

    public Task<InviteDto> CreateInvite(Guid familyId, string tokenHash, string? email, MemberRole role, Guid? profileId, Guid invitedByProfileId, DateTimeOffset expiresAt, DateTimeOffset createdAt)
    {
        var invite = new InviteDto
        {
            Id = Guid.NewGuid(),
            FamilyId = familyId,
            Email = email,
            Role = role,
            ProfileId = profileId,
            InvitedByProfileId = invitedByProfileId,
            ExpiresAt = expiresAt,
            CreatedAt = createdAt
        };

        db.Invites[tokenHash] = invite;
        return Task.FromResult(invite);
    }

    public Task<List<InviteDto>> GetPendingInvites(Guid familyId, DateTimeOffset now) =>
        Task.FromResult(db.Invites.Values
            .Where(i => i.FamilyId == familyId && i.ClaimedAt is null && i.RevokedAt is null && i.ExpiresAt > now)
            .ToList());

    public Task<InviteDto?> GetInvite(Guid familyId, Guid inviteId) =>
        Task.FromResult(db.Invites.Values.SingleOrDefault(i => i.Id == inviteId && i.FamilyId == familyId));

    public Task<InviteDto?> GetInviteByTokenHash(string tokenHash) =>
        Task.FromResult(db.Invites.GetValueOrDefault(tokenHash));

    public Task ReissueInvite(Guid inviteId, string tokenHash, DateTimeOffset expiresAt)
    {
        var old = db.Invites.Single(kv => kv.Value.Id == inviteId);
        db.Invites.Remove(old.Key);
        old.Value.ExpiresAt = expiresAt;
        db.Invites[tokenHash] = old.Value;
        return Task.CompletedTask;
    }

    public Task RevokeInvite(Guid inviteId, DateTimeOffset revokedAt)
    {
        db.Invites.Values.Single(i => i.Id == inviteId).RevokedAt ??= revokedAt;
        return Task.CompletedTask;
    }

    public Task<Guid?> Join(JoinDto join)
    {
        var invite = db.Invites.Values.Single(i => i.Id == join.InviteId);

        if (invite.ClaimedAt is not null || invite.RevokedAt is not null)
        {
            return Task.FromResult<Guid?>(null);
        }

        Guid profileId;

        if (join.ClaimProfileId is { } claimId)
        {
            var profile = db.Profiles[claimId];
            if (profile.UserId is not null)
            {
                return Task.FromResult<Guid?>(null);
            }

            profile.UserId = join.UserId;
            profile.IsPlaceholder = false;
            profileId = claimId;

            foreach (var other in db.Invites.Values.Where(i => i.ProfileId == claimId && i.Id != invite.Id && i.ClaimedAt is null && i.RevokedAt is null))
            {
                other.RevokedAt = join.JoinedAt;
            }
        }
        else
        {
            profileId = db.AddProfile(join.FamilyId, join.NewFirstName, join.NewLastName, userId: join.UserId, createdAt: join.JoinedAt).Id;
        }

        invite.ClaimedAt = join.JoinedAt;
        db.Members.Add(new FakeDatabase.Member(join.FamilyId, profileId, join.Role, join.JoinedAt));

        return Task.FromResult<Guid?>(profileId);
    }
}
