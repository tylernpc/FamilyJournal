using FamilyJournalApi.Managers.Models;

namespace FamilyJournalApi.Managers;

public interface IFamilyManager
{
    /// <summary>
    /// Creates the family with the signed-in user as its admin. Null if the user no longer exists.
    /// </summary>
    Task<FamilyModel?> CreateFamily(Guid userId, CreateFamilyRequest request);

    Task<FamilyModel?> GetFamily(Guid familyId);
}
