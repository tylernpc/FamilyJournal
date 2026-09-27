using FamilyJournalApi.Common.Enum;

namespace FamilyJournalApi.Accessors.DTOs;

public class UserDto
{
    public Guid Id { get; set; }

    public string Email { get; set; } = string.Empty;

    public string PasswordHash { get; set; } = string.Empty;

    public string FirstName { get; set; } = string.Empty;

    public string LastName { get; set; } = string.Empty;

    public int FailedSignInCount { get; set; }

    public DateTimeOffset? LockoutEndsAt { get; set; }

    public DateTimeOffset? LastSignInAt { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
}

public class RefreshTokenDto
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }

    public Guid ChainId { get; set; }

    public DateTimeOffset ExpiresAt { get; set; }

    public DateTimeOffset? RevokedAt { get; set; }
}

/// <summary>
/// A family the user belongs to, and their profile and role in it.
/// </summary>
public class UserFamilyDto
{
    public Guid FamilyId { get; set; }

    public string FamilyName { get; set; } = string.Empty;

    public Guid ProfileId { get; set; }

    public MemberRole Role { get; set; }

    public DateTimeOffset JoinedAt { get; set; }
}
