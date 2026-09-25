using System.ComponentModel.DataAnnotations;

namespace FamilyJournalApi.Managers.Models;

public class CreateFamilyRequest
{
    [Required]
    [StringLength(200, MinimumLength = 1)]
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Display name for the creator's own profile. Temporary until auth (#4) can supply it from the signed-in user.
    /// </summary>
    [Required]
    [StringLength(200, MinimumLength = 1)]
    public string FounderDisplayName { get; set; } = string.Empty;
}
