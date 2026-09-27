using FamilyJournalApi.Accessors;
using FamilyJournalApi.Accessors.DTOs;

namespace FamilyJournalApi.Tests.Fakes;

public class FakeFamilyAccessor : IFamilyAccessor
{
    public Dictionary<Guid, List<UserFamilyDto>> FamiliesByUser { get; } = [];

    public Task<FamilyDto> CreateFamily(string name, string founderDisplayName, Guid founderUserId, DateTimeOffset createdAt) =>
        throw new NotSupportedException();

    public Task<FamilyDto?> GetFamily(Guid familyId) => throw new NotSupportedException();

    public Task<List<UserFamilyDto>> GetFamiliesForUser(Guid userId) =>
        Task.FromResult(FamiliesByUser.TryGetValue(userId, out var list) ? list : []);
}
