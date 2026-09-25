using FamilyJournalApi.Accessors.DTOs;

namespace FamilyJournalApi.Accessors;

public interface IFamilyAccessor
{
    /// <summary>
    /// Creates the family, the founder's profile, and the founder's admin membership in one save.
    /// </summary>
    Task<FamilyDto> CreateFamily(string name, string founderDisplayName, Guid? founderUserId, DateTimeOffset createdAt);

    Task<FamilyDto?> GetFamily(Guid familyId);
}
