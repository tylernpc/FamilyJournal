using FamilyJournalApi.Accessors.DTOs;
using FamilyJournalApi.Common.Enum;

namespace FamilyJournalApi.Tests.Fakes;

/// <summary>
/// Shared in-memory state behind the fake accessors, so a test can set up a family once and every
/// accessor sees the same people.
/// </summary>
public class FakeDatabase
{
    public record Member(Guid FamilyId, Guid ProfileId, MemberRole Role, DateTimeOffset JoinedAt);

    public Dictionary<Guid, string> Families { get; } = [];

    public Dictionary<Guid, ProfileDto> Profiles { get; } = [];

    public List<Member> Members { get; } = [];

    // Keyed by token hash, like the unique index
    public Dictionary<string, InviteDto> Invites { get; } = [];

    public List<RelationshipDto> Relationships { get; } = [];

    public Dictionary<Guid, MediaDto> Media { get; } = [];

    public ProfileDto AddProfile(
        Guid familyId,
        string firstName,
        string lastName = "",
        Guid? userId = null,
        Guid? addedBy = null,
        LifeStatus lifeStatus = LifeStatus.Living,
        DateOnly? birthDate = null,
        DateTimeOffset? createdAt = null)
    {
        var profile = new ProfileDto
        {
            Id = Guid.NewGuid(),
            FamilyId = familyId,
            FirstName = firstName,
            LastName = lastName,
            UserId = userId,
            IsPlaceholder = userId is null,
            AddedByProfileId = addedBy,
            LifeStatus = lifeStatus,
            BirthDate = birthDate,
            CreatedAt = createdAt ?? DateTimeOffset.UnixEpoch
        };

        Profiles[profile.Id] = profile;
        return profile;
    }

    /// <summary>
    /// A family with one admin, ready for tests: returns the family id and the admin's profile.
    /// </summary>
    public (Guid FamilyId, ProfileDto Admin) AddFamily(string name = "Harlow Family")
    {
        var familyId = Guid.NewGuid();
        Families[familyId] = name;

        var admin = AddProfile(familyId, "Emma", "Okafor", userId: Guid.NewGuid());
        Members.Add(new Member(familyId, admin.Id, MemberRole.Admin, DateTimeOffset.UnixEpoch));

        return (familyId, admin);
    }

    public ProfileDto AddMember(Guid familyId, string firstName, MemberRole role = MemberRole.Member)
    {
        var profile = AddProfile(familyId, firstName, userId: Guid.NewGuid());
        Members.Add(new Member(familyId, profile.Id, role, DateTimeOffset.UnixEpoch));
        return profile;
    }

    public List<FamilyMemberDto> MembersOf(Guid familyId) =>
        Members
            .Where(m => m.FamilyId == familyId)
            .Select(m => new FamilyMemberDto
            {
                ProfileId = m.ProfileId,
                UserId = Profiles[m.ProfileId].UserId,
                FirstName = Profiles[m.ProfileId].FirstName,
                LastName = Profiles[m.ProfileId].LastName,
                Role = m.Role,
                JoinedAt = m.JoinedAt
            })
            .ToList();

    public FamilyDto? Family(Guid familyId) =>
        Families.TryGetValue(familyId, out var name)
            ? new FamilyDto { Id = familyId, Name = name, Members = MembersOf(familyId) }
            : null;

    /// <summary>
    /// A profile as the accessor returns it, with role and join date filled in from membership.
    /// </summary>
    public ProfileDto? View(Guid familyId, Guid profileId, DateTimeOffset now)
    {
        if (!Profiles.TryGetValue(profileId, out var p) || p.FamilyId != familyId)
        {
            return null;
        }

        var member = Members.SingleOrDefault(m => m.FamilyId == familyId && m.ProfileId == profileId);
        p.IsPlaceholder = p.UserId is null;
        p.Role = member?.Role;
        p.JoinedAt = member?.JoinedAt;
        p.InviteSentAt = Invites.Values
            .Where(i => i.ProfileId == profileId && i.ClaimedAt is null && i.RevokedAt is null && i.ExpiresAt > now)
            .Select(i => (DateTimeOffset?)i.CreatedAt)
            .Max();

        return p;
    }
}
