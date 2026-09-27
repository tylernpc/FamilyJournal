using FamilyJournalApi.Accessors;
using FamilyJournalApi.Accessors.DTOs;
using FamilyJournalApi.Managers.Models;

namespace FamilyJournalApi.Managers;

/// <summary>
/// note: managers are generally for business logic
/// a manager should generally own its own orchestration i.e. it should be
/// used for something specifically
/// </summary>
public class FamilyManager(IFamilyAccessor familyAccessor, IUserAccessor userAccessor, TimeProvider timeProvider) : IFamilyManager
{
    public async Task<FamilyModel?> CreateFamily(Guid userId, CreateFamilyRequest request)
    {
        var founder = await userAccessor.GetUser(userId);

        if (founder is null)
        {
            return null;
        }

        var family = await familyAccessor.CreateFamily(
            request.Name.Trim(),
            $"{founder.FirstName} {founder.LastName}",
            founder.Id,
            timeProvider.GetUtcNow());

        // TODO(#3): publish MemberJoined once MassTransit is wired up

        return ToModel(family);
    }

    public async Task<FamilyModel?> GetFamily(Guid familyId)
    {
        // TODO(#20): restrict to members of the family
        var family = await familyAccessor.GetFamily(familyId);

        return family is null ? null : ToModel(family);
    }

    private static FamilyModel ToModel(FamilyDto dto) => new()
    {
        Id = dto.Id,
        Name = dto.Name,
        CreatedAt = dto.CreatedAt,
        Members = dto.Members
            .Select(m => new FamilyMemberModel
            {
                ProfileId = m.ProfileId,
                DisplayName = m.DisplayName,
                Role = m.Role,
                JoinedAt = m.JoinedAt
            })
            .ToList()
    };
}
