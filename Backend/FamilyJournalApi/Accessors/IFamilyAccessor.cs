using FamilyJournalApi.Accessors.DTOs;
using FamilyJournalApi.Common.Enum;

namespace FamilyJournalApi.Accessors;

public interface IFamilyAccessor
{
    /// <summary>
    /// Creates the family, the founder's profile, and makes the founder its admin, in one save.
    /// </summary>
    Task<FamilyDto> CreateFamily(string name, string founderFirstName, string founderLastName, Guid founderUserId, DateTimeOffset createdAt);

    Task<FamilyDto?> GetFamily(Guid familyId);

    Task RenameFamily(Guid familyId, string name);

    /// <summary>
    /// Every family the user has a profile in, the one they joined first at the top.
    /// </summary>
    Task<List<UserFamilyDto>> GetFamiliesForUser(Guid userId);

    /// <summary>
    /// The user's access to one family, or null if they don't belong to it.
    /// </summary>
    Task<FamilyMemberDto?> GetMemberByUser(Guid familyId, Guid userId);

    Task<FamilyMemberDto?> GetMemberByProfile(Guid familyId, Guid profileId);

    Task<List<FamilyMemberDto>> GetMembers(Guid familyId);

    Task SetMemberRole(Guid familyId, Guid profileId, MemberRole role);

    Task<InviteDto> CreateInvite(Guid familyId, string tokenHash, string? email, MemberRole role, Guid? profileId, Guid invitedByProfileId, DateTimeOffset expiresAt, DateTimeOffset createdAt);

    /// <summary>
    /// Invites that haven't been claimed, revoked, or expired.
    /// </summary>
    Task<List<InviteDto>> GetPendingInvites(Guid familyId, DateTimeOffset now);

    Task<InviteDto?> GetInvite(Guid familyId, Guid inviteId);

    Task<InviteDto?> GetInviteByTokenHash(string tokenHash);

    /// <summary>
    /// Swaps in a new token (the old link stops working) and a new expiry.
    /// </summary>
    Task ReissueInvite(Guid inviteId, string tokenHash, DateTimeOffset expiresAt);

    Task RevokeInvite(Guid inviteId, DateTimeOffset revokedAt);

    /// <summary>
    /// Joins the family through an invite in one transaction: claims the placeholder or creates a profile,
    /// adds the member, and marks the invite used. Returns the joining profile's id, or null if the
    /// invite was already used or the placeholder was claimed by someone else first.
    /// </summary>
    Task<Guid?> Join(JoinDto join);
}
