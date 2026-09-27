using FamilyJournalApi.Managers.Models;

namespace FamilyJournalApi.Managers;

public interface IProfileManager
{
    Task<List<PersonModel>> GetPeople(FamilyCaller caller);

    Task<Result<PersonModel>> GetPerson(FamilyCaller caller, Guid profileId);

    /// <summary>
    /// Adds someone who isn't on the app (a grandparent, a baby, someone who passed away).
    /// </summary>
    Task<Result<PersonModel>> CreatePerson(FamilyCaller caller, PersonRequest request);

    Task<Result<PersonModel>> UpdatePerson(FamilyCaller caller, Guid profileId, PersonRequest request);

    Task<Result<Done>> DeletePerson(FamilyCaller caller, Guid profileId);

    Task<List<RelationshipModel>> GetRelationships(FamilyCaller caller);

    Task<Result<RelationshipModel>> AddRelationship(FamilyCaller caller, AddRelationshipRequest request);

    Task<Result<Done>> RemoveRelationship(FamilyCaller caller, Guid relationshipId);

    Task<TreeModel> GetTree(FamilyCaller caller);
}
