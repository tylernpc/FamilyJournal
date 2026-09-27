using System.ComponentModel.DataAnnotations;
using FamilyJournalApi.Common.Enum;

namespace FamilyJournalApi.Managers.Models;

public class FamilyModel
{
    public Guid Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public DateTimeOffset CreatedAt { get; set; }

    public List<FamilyMemberModel> Members { get; set; } = [];
}

public class FamilyMemberModel
{
    public Guid ProfileId { get; set; }

    public string FirstName { get; set; } = string.Empty;

    public string LastName { get; set; } = string.Empty;

    public MemberRole Role { get; set; }

    public DateTimeOffset JoinedAt { get; set; }
}

public class RenameFamilyRequest
{
    [Required]
    [StringLength(200, MinimumLength = 1)]
    public string Name { get; set; } = string.Empty;
}

public class SetRoleRequest
{
    public MemberRole Role { get; set; }
}

public class CreateInviteRequest
{
    // Optional: the link works on its own; email delivery comes later
    [EmailAddress]
    [StringLength(320)]
    public string? Email { get; set; }

    // A placeholder the invitee should claim, e.g. Grandma June's existing profile
    public Guid? ProfileId { get; set; }

    public MemberRole Role { get; set; } = MemberRole.Member;
}

public class InviteModel
{
    public Guid Id { get; set; }

    public string? Email { get; set; }

    public MemberRole Role { get; set; }

    public Guid? ProfileId { get; set; }

    public Guid? InvitedByProfileId { get; set; }

    public DateTimeOffset ExpiresAt { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
}

/// <summary>
/// Returned once when an invite is created or resent. The token isn't stored, so it can't be shown again.
/// </summary>
public class InviteLinkModel
{
    public InviteModel Invite { get; set; } = new();

    public string Token { get; set; } = string.Empty;
}

/// <summary>
/// What someone opening an invite link sees before signing in.
/// </summary>
public class InvitePreviewModel
{
    public string FamilyName { get; set; } = string.Empty;

    public string? InvitedByName { get; set; }

    public MemberRole Role { get; set; }

    public DateTimeOffset ExpiresAt { get; set; }

    // The profile this invite is for, if the inviter picked one
    public InviteeProfileModel? Profile { get; set; }

    // Otherwise, placeholders they could say are them
    public List<InviteeProfileModel> ClaimableProfiles { get; set; } = [];
}

public class InviteeProfileModel
{
    public Guid Id { get; set; }

    public string FirstName { get; set; } = string.Empty;

    public string LastName { get; set; } = string.Empty;

    public int? BirthYear { get; set; }

    public string? PhotoUrl { get; set; }
}

public class AcceptInviteRequest
{
    // Claim this placeholder instead of starting a new profile. Ignored if the invite already names one.
    public Guid? ClaimProfileId { get; set; }
}
