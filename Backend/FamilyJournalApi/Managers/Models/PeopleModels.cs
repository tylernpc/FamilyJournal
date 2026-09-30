using System.ComponentModel.DataAnnotations;
using FamilyJournalApi.Common;
using FamilyJournalApi.Common.Enum;

namespace FamilyJournalApi.Managers.Models;

public class PersonModel
{
    public Guid Id { get; set; }

    public string FirstName { get; set; } = string.Empty;

    public string LastName { get; set; } = string.Empty;

    public string? MaidenName { get; set; }

    public Gender Gender { get; set; }

    public LifeStatus LifeStatus { get; set; }

    public DateOnly? BirthDate { get; set; }

    public DateOnly? DeathDate { get; set; }

    public string? Bio { get; set; }

    public string? Location { get; set; }

    public PhotoModel? Photo { get; set; }

    // No account yet: added by someone else, and maybe invited to claim it
    public bool IsPlaceholder { get; set; }

    // Set for people with an account in this family
    public MemberRole? Role { get; set; }

    public DateTimeOffset? JoinedAt { get; set; }

    public DateTimeOffset? InviteSentAt { get; set; }

    public Guid? AddedByProfileId { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    // Whether the signed-in person may edit this profile
    public bool CanEdit { get; set; }
}

public class PhotoModel
{
    public Guid MediaId { get; set; }

    // Signed and temporary; fetch fresh data rather than storing it
    public string Url { get; set; } = string.Empty;

    public int Width { get; set; }

    public int Height { get; set; }

    public string? AltText { get; set; }

    // How each place frames it; Url is always the whole original
    public PhotoCrops? Crops { get; set; }
}

/// <summary>
/// A whole profile. PUT replaces every field, so send the ones you aren't changing too.
/// </summary>
public class PersonRequest
{
    [Required]
    [StringLength(100, MinimumLength = 1)]
    public string FirstName { get; set; } = string.Empty;

    [StringLength(100)]
    public string LastName { get; set; } = string.Empty;

    [StringLength(100)]
    public string? MaidenName { get; set; }

    public Gender Gender { get; set; }

    public LifeStatus LifeStatus { get; set; }

    public DateOnly? BirthDate { get; set; }

    public DateOnly? DeathDate { get; set; }

    [StringLength(1000)]
    public string? Bio { get; set; }

    [StringLength(200)]
    public string? Location { get; set; }

    public Guid? PhotoMediaId { get; set; }
}

public class RelationshipModel
{
    public Guid Id { get; set; }

    // ParentOf: From is the parent. SpouseOf: either way round.
    public Guid FromProfileId { get; set; }

    public Guid ToProfileId { get; set; }

    public RelationshipType Type { get; set; }

    public DateOnly? Since { get; set; }
}

public class AddRelationshipRequest
{
    [Required]
    public Guid FromProfileId { get; set; }

    [Required]
    public Guid ToProfileId { get; set; }

    public RelationshipType Type { get; set; }

    // Spouses: the wedding date
    public DateOnly? Since { get; set; }
}

public class TreeModel
{
    public int Generations { get; set; }

    public List<TreeNodeModel> People { get; set; } = [];

    public List<RelationshipModel> Relationships { get; set; } = [];
}

public class TreeNodeModel
{
    public Guid ProfileId { get; set; }

    public int Generation { get; set; }

    public List<Guid> ParentIds { get; set; } = [];

    public List<Guid> ChildIds { get; set; } = [];

    public List<Guid> SpouseIds { get; set; } = [];

    public List<Guid> SiblingIds { get; set; } = [];
}
