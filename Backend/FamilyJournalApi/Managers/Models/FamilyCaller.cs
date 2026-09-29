using FamilyJournalApi.Common.Enum;

namespace FamilyJournalApi.Managers.Models;

/// <summary>
/// The signed-in person acting inside one family: which family, their profile there, and their role.
/// Resolved once per request by the family access filter; a caller always belongs to the family.
/// </summary>
public record FamilyCaller(Guid FamilyId, Guid ProfileId, MemberRole Role)
{
    public bool IsAdmin => Role == MemberRole.Admin;
}
