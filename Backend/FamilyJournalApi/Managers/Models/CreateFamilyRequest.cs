using System.ComponentModel.DataAnnotations;

namespace FamilyJournalApi.Managers.Models;

public class CreateFamilyRequest
{
    [Required]
    [StringLength(200, MinimumLength = 1)]
    public string Name { get; set; } = string.Empty;
}
