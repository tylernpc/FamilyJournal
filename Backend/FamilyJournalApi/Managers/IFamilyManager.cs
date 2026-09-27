using FamilyJournalApi.Common.Enum;
using FamilyJournalApi.Managers.Models;

namespace FamilyJournalApi.Managers;

public interface IFamilyManager
{
    /// <summary>
    /// Creates the family with the signed-in user as its admin. Null if the user no longer exists.
    /// </summary>
    Task<FamilyModel?> CreateFamily(Guid userId, CreateFamilyRequest request);

    /// <summary>
    /// The user's identity inside a family, or null if they don't belong to it.
    /// </summary>
    Task<FamilyCaller?> GetCaller(Guid familyId, Guid userId);

    Task<FamilyModel> GetFamily(FamilyCaller caller);

    Task<Result<FamilyModel>> RenameFamily(FamilyCaller caller, RenameFamilyRequest request);

    Task<Result<FamilyMemberModel>> SetRole(FamilyCaller caller, Guid profileId, MemberRole role);

    Task<Result<InviteLinkModel>> CreateInvite(FamilyCaller caller, CreateInviteRequest request);

    Task<List<InviteModel>> GetPendingInvites(FamilyCaller caller);

    /// <summary>
    /// New link and expiry for an existing invite; the old link stops working.
    /// </summary>
    Task<Result<InviteLinkModel>> ResendInvite(FamilyCaller caller, Guid inviteId);

    Task<Result<Done>> RevokeInvite(FamilyCaller caller, Guid inviteId);

    /// <summary>
    /// What the invite link shows before sign-in. Null for unknown, used, revoked or expired links.
    /// </summary>
    Task<InvitePreviewModel?> PreviewInvite(string token);

    Task<Result<UserFamilyModel>> AcceptInvite(Guid userId, string token, AcceptInviteRequest request);
}
