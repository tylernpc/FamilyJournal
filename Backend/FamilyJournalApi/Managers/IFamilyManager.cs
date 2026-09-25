using FamilyJournalApi.Managers.Models;

namespace FamilyJournalApi.Managers;

public interface IFamilyManager
{
    Task<FamilyModel> CreateFamily(CreateFamilyRequest request);

    Task<FamilyModel?> GetFamily(Guid familyId);
}
