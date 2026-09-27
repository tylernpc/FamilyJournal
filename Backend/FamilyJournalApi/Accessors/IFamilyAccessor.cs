using FamilyJournalApi.Accessors.DTOs;

namespace FamilyJournalApi.Accessors;

public interface IFamilyAccessor
{
    /// <summary>
    /// Creates the family, the founder's profile, and makes the founder its admin, in one save.
    /// </summary>
    Task<FamilyDto> CreateFamily(string name, string founderDisplayName, Guid founderUserId, DateTimeOffset createdAt);

    Task<FamilyDto?> GetFamily(Guid familyId);

    /// <summary>
    /// Every family the user has a profile in, the one they joined first at the top.
    /// </summary>
    Task<List<UserFamilyDto>> GetFamiliesForUser(Guid userId);
}
