using System.ComponentModel.DataAnnotations;
using FamilyJournalApi.Common.Enum;

namespace FamilyJournalApi.Managers.Models;

public class RegisterRequest
{
    [Required]
    [EmailAddress]
    [StringLength(320)]
    public string Email { get; set; } = string.Empty;

    // Length over composition rules (NIST 800-63B); 128 caps hashing cost
    [Required]
    [StringLength(128, MinimumLength = 10)]
    public string Password { get; set; } = string.Empty;

    [Required]
    [StringLength(100, MinimumLength = 1)]
    public string FirstName { get; set; } = string.Empty;

    [Required]
    [StringLength(100, MinimumLength = 1)]
    public string LastName { get; set; } = string.Empty;
}

public class SignInRequest
{
    [Required]
    [StringLength(320)]
    public string Email { get; set; } = string.Empty;

    [Required]
    [StringLength(128)]
    public string Password { get; set; } = string.Empty;
}

public class RefreshRequest
{
    [Required]
    [StringLength(100)]
    public string RefreshToken { get; set; } = string.Empty;
}

public class AuthTokensModel
{
    public string TokenType { get; set; } = "Bearer";

    public string AccessToken { get; set; } = string.Empty;

    public DateTimeOffset AccessTokenExpiresAt { get; set; }

    public string RefreshToken { get; set; } = string.Empty;

    public DateTimeOffset RefreshTokenExpiresAt { get; set; }
}

public enum AuthError
{
    EmailTaken,
    InvalidCredentials,
    LockedOut,
    InvalidRefreshToken
}

public class AuthResult
{
    public AuthTokensModel? Tokens { get; init; }

    public AuthError? Error { get; init; }

    public DateTimeOffset? LockedOutUntil { get; init; }

    public static AuthResult Success(AuthTokensModel tokens) => new() { Tokens = tokens };

    public static AuthResult Failure(AuthError error) => new() { Error = error };
}

/// <summary>
/// The signed-in user and the families they belong to.
/// </summary>
public class AccountModel
{
    public Guid Id { get; set; }

    public string Email { get; set; } = string.Empty;

    public string FirstName { get; set; } = string.Empty;

    public string LastName { get; set; } = string.Empty;

    public DateTimeOffset CreatedAt { get; set; }

    public List<UserFamilyModel> Families { get; set; } = [];
}

public class UserFamilyModel
{
    public Guid FamilyId { get; set; }

    public string FamilyName { get; set; } = string.Empty;

    public Guid ProfileId { get; set; }

    public MemberRole Role { get; set; }

    public DateTimeOffset JoinedAt { get; set; }
}
