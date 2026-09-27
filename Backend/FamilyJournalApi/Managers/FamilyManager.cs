using FamilyJournalApi.Accessors;
using FamilyJournalApi.Accessors.DTOs;
using FamilyJournalApi.Common.Enum;
using FamilyJournalApi.Engines;
using FamilyJournalApi.Managers.Events;
using FamilyJournalApi.Managers.Models;

namespace FamilyJournalApi.Managers;

/// <summary>
/// note: managers are generally for business logic
/// a manager should generally own its own orchestration i.e. it should be
/// used for something specifically
/// </summary>
public class FamilyManager(
    IFamilyAccessor familyAccessor,
    IUserAccessor userAccessor,
    IProfileAccessor profileAccessor,
    IMediaAccessor mediaAccessor,
    ICredentialEngine credentialEngine,
    IEventPublisher events,
    TimeProvider timeProvider) : IFamilyManager
{
    public static readonly TimeSpan InviteLifetime = TimeSpan.FromDays(14);

    public async Task<FamilyModel?> CreateFamily(Guid userId, CreateFamilyRequest request)
    {
        var founder = await userAccessor.GetUser(userId);

        if (founder is null)
        {
            return null;
        }

        var family = await familyAccessor.CreateFamily(
            request.Name.Trim(),
            founder.FirstName,
            founder.LastName,
            founder.Id,
            timeProvider.GetUtcNow());

        return ToModel(family);
    }

    public async Task<FamilyCaller?> GetCaller(Guid familyId, Guid userId)
    {
        var member = await familyAccessor.GetMemberByUser(familyId, userId);

        return member is null ? null : new FamilyCaller(familyId, member.ProfileId, member.Role);
    }

    public async Task<FamilyModel> GetFamily(FamilyCaller caller)
    {
        var family = await familyAccessor.GetFamily(caller.FamilyId);

        return ToModel(family!);
    }

    public async Task<Result<FamilyModel>> RenameFamily(FamilyCaller caller, RenameFamilyRequest request)
    {
        if (!caller.IsAdmin)
        {
            return Result<FamilyModel>.Forbidden("Only admins can rename the family.");
        }

        await familyAccessor.RenameFamily(caller.FamilyId, request.Name.Trim());

        return await GetFamily(caller);
    }

    public async Task<Result<FamilyMemberModel>> SetRole(FamilyCaller caller, Guid profileId, MemberRole role)
    {
        if (!caller.IsAdmin)
        {
            return Result<FamilyMemberModel>.Forbidden("Only admins can change roles.");
        }

        var target = await familyAccessor.GetMemberByProfile(caller.FamilyId, profileId);

        if (target is null)
        {
            return Result<FamilyMemberModel>.NotFound("That person hasn't joined the family.");
        }

        if (target.Role == MemberRole.Admin && role != MemberRole.Admin)
        {
            var admins = (await familyAccessor.GetMembers(caller.FamilyId)).Count(m => m.Role == MemberRole.Admin);

            if (admins <= 1)
            {
                return Result<FamilyMemberModel>.Conflict("A family needs at least one admin. Make someone else an admin first.");
            }
        }

        await familyAccessor.SetMemberRole(caller.FamilyId, profileId, role);
        target.Role = role;

        return ToModel(target);
    }

    public async Task<Result<InviteLinkModel>> CreateInvite(FamilyCaller caller, CreateInviteRequest request)
    {
        if (request.Role == MemberRole.Admin && !caller.IsAdmin)
        {
            return Result<InviteLinkModel>.Forbidden("Only admins can invite other admins.");
        }

        var now = timeProvider.GetUtcNow();

        if (request.ProfileId is { } profileId)
        {
            var profile = await profileAccessor.GetProfile(caller.FamilyId, profileId, now);

            if (profile is null)
            {
                return Result<InviteLinkModel>.NotFound("That person isn't in this family.");
            }

            if (!profile.IsPlaceholder)
            {
                return Result<InviteLinkModel>.Conflict($"{profile.FirstName} has already joined.");
            }

            if (profile.LifeStatus == LifeStatus.Deceased)
            {
                return Result<InviteLinkModel>.Invalid($"{profile.FirstName}'s profile is kept in memory and can't be claimed.");
            }
        }

        var (token, hash) = credentialEngine.CreateInviteToken();

        var invite = await familyAccessor.CreateInvite(
            caller.FamilyId,
            hash,
            string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim(),
            request.Role,
            request.ProfileId,
            caller.ProfileId,
            now.Add(InviteLifetime),
            now);

        // TODO: email the link once an email provider is set up; for now the inviter shares it

        return new InviteLinkModel { Invite = ToModel(invite), Token = token };
    }

    public async Task<List<InviteModel>> GetPendingInvites(FamilyCaller caller)
    {
        var invites = await familyAccessor.GetPendingInvites(caller.FamilyId, timeProvider.GetUtcNow());

        return invites.Select(ToModel).ToList();
    }

    public async Task<Result<InviteLinkModel>> ResendInvite(FamilyCaller caller, Guid inviteId)
    {
        var invite = await familyAccessor.GetInvite(caller.FamilyId, inviteId);

        if (invite is null || invite.ClaimedAt is not null || invite.RevokedAt is not null)
        {
            return Result<InviteLinkModel>.NotFound("That invite is no longer open.");
        }

        if (!caller.IsAdmin && invite.InvitedByProfileId != caller.ProfileId)
        {
            return Result<InviteLinkModel>.Forbidden("Only the person who sent this invite, or an admin, can resend it.");
        }

        var (token, hash) = credentialEngine.CreateInviteToken();
        var expiresAt = timeProvider.GetUtcNow().Add(InviteLifetime);

        await familyAccessor.ReissueInvite(invite.Id, hash, expiresAt);
        invite.ExpiresAt = expiresAt;

        return new InviteLinkModel { Invite = ToModel(invite), Token = token };
    }

    public async Task<Result<Done>> RevokeInvite(FamilyCaller caller, Guid inviteId)
    {
        var invite = await familyAccessor.GetInvite(caller.FamilyId, inviteId);

        if (invite is null)
        {
            return Result<Done>.NotFound();
        }

        if (!caller.IsAdmin && invite.InvitedByProfileId != caller.ProfileId)
        {
            return Result<Done>.Forbidden("Only the person who sent this invite, or an admin, can cancel it.");
        }

        await familyAccessor.RevokeInvite(invite.Id, timeProvider.GetUtcNow());

        return Done.Value;
    }

    public async Task<InvitePreviewModel?> PreviewInvite(string token)
    {
        var now = timeProvider.GetUtcNow();
        var invite = await OpenInvite(token, now);

        if (invite is null)
        {
            return null;
        }

        var family = await familyAccessor.GetFamily(invite.FamilyId);
        var people = await profileAccessor.GetProfiles(invite.FamilyId, now);
        var inviter = people.SingleOrDefault(p => p.Id == invite.InvitedByProfileId);

        var claimable = invite.ProfileId is null
            ? people.Where(p => IsClaimable(p, now)).Select(p => ToInvitee(p, now)).ToList()
            : [];

        return new InvitePreviewModel
        {
            FamilyName = family!.Name,
            InvitedByName = inviter is null ? null : $"{inviter.FirstName} {inviter.LastName}".Trim(),
            Role = invite.Role,
            ExpiresAt = invite.ExpiresAt,
            Profile = people.Where(p => p.Id == invite.ProfileId).Select(p => ToInvitee(p, now)).SingleOrDefault(),
            ClaimableProfiles = claimable
        };
    }

    public async Task<Result<UserFamilyModel>> AcceptInvite(Guid userId, string token, AcceptInviteRequest request)
    {
        var now = timeProvider.GetUtcNow();
        var invite = await OpenInvite(token, now);

        if (invite is null)
        {
            return Result<UserFamilyModel>.NotFound("This invite link has expired or was already used. Ask for a new one.");
        }

        var user = await userAccessor.GetUser(userId);

        if (user is null)
        {
            return Result<UserFamilyModel>.NotFound("Your account couldn't be found.");
        }

        if (await familyAccessor.GetMemberByUser(invite.FamilyId, userId) is not null)
        {
            return Result<UserFamilyModel>.Conflict("You're already in this family.");
        }

        var claimId = invite.ProfileId ?? request.ClaimProfileId;

        if (claimId is { } id)
        {
            var profile = await profileAccessor.GetProfile(invite.FamilyId, id, now);

            if (profile is null || !IsClaimable(profile, now))
            {
                return Result<UserFamilyModel>.Conflict("That profile can't be claimed. It may belong to someone else already.");
            }
        }

        var profileId = await familyAccessor.Join(new JoinDto
        {
            InviteId = invite.Id,
            FamilyId = invite.FamilyId,
            UserId = userId,
            Role = invite.Role,
            ClaimProfileId = claimId,
            NewFirstName = user.FirstName,
            NewLastName = user.LastName,
            JoinedAt = now
        });

        if (profileId is null)
        {
            return Result<UserFamilyModel>.Conflict("Someone used this invite or claimed that profile at the same moment. Try again.");
        }

        await events.Publish(new MemberJoined(invite.FamilyId, profileId.Value, now));

        var family = await familyAccessor.GetFamily(invite.FamilyId);

        return new UserFamilyModel
        {
            FamilyId = invite.FamilyId,
            FamilyName = family!.Name,
            ProfileId = profileId.Value,
            Role = invite.Role,
            JoinedAt = now
        };
    }

    private async Task<InviteDto?> OpenInvite(string token, DateTimeOffset now)
    {
        var invite = await familyAccessor.GetInviteByTokenHash(credentialEngine.HashInviteToken(token));

        return invite is { ClaimedAt: null, RevokedAt: null } && invite.ExpiresAt > now ? invite : null;
    }

    // Someone who hasn't joined, is alive, and is old enough to have their own account
    private static bool IsClaimable(ProfileDto profile, DateTimeOffset now) =>
        profile.IsPlaceholder &&
        profile.LifeStatus == LifeStatus.Living &&
        (profile.BirthDate is not { } born || born.AddYears(13) <= DateOnly.FromDateTime(now.UtcDateTime));

    private InviteeProfileModel ToInvitee(ProfileDto profile, DateTimeOffset now) => new()
    {
        Id = profile.Id,
        FirstName = profile.FirstName,
        LastName = profile.LastName,
        BirthYear = profile.BirthDate?.Year,
        PhotoUrl = profile.PhotoMediaId is { } mediaId ? mediaAccessor.GetSignedUrl(mediaId, now) : null
    };

    private static FamilyModel ToModel(FamilyDto dto) => new()
    {
        Id = dto.Id,
        Name = dto.Name,
        CreatedAt = dto.CreatedAt,
        Members = dto.Members.Select(ToModel).ToList()
    };

    private static FamilyMemberModel ToModel(FamilyMemberDto member) => new()
    {
        ProfileId = member.ProfileId,
        FirstName = member.FirstName,
        LastName = member.LastName,
        Role = member.Role,
        JoinedAt = member.JoinedAt
    };

    private static InviteModel ToModel(InviteDto invite) => new()
    {
        Id = invite.Id,
        Email = invite.Email,
        Role = invite.Role,
        ProfileId = invite.ProfileId,
        InvitedByProfileId = invite.InvitedByProfileId,
        ExpiresAt = invite.ExpiresAt,
        CreatedAt = invite.CreatedAt
    };
}
