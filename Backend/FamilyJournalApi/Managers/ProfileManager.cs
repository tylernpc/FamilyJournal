using FamilyJournalApi.Accessors;
using FamilyJournalApi.Accessors.DTOs;
using FamilyJournalApi.Common.Enum;
using FamilyJournalApi.Engines;
using FamilyJournalApi.Engines.Contracts;
using FamilyJournalApi.Managers.Models;

namespace FamilyJournalApi.Managers;

/// <summary>
/// People in the family (members and placeholders), how they're related, and the tree built from that.
/// </summary>
public class ProfileManager(
    IProfileAccessor profileAccessor,
    IRelationshipAccessor relationshipAccessor,
    IMediaAccessor mediaAccessor,
    ITreeEngine treeEngine,
    TimeProvider timeProvider) : IProfileManager
{
    public async Task<List<PersonModel>> GetPeople(FamilyCaller caller)
    {
        var now = timeProvider.GetUtcNow();
        var people = await profileAccessor.GetProfiles(caller.FamilyId, now);

        return people.Select(p => ToModel(caller, p, now)).ToList();
    }

    public async Task<Result<PersonModel>> GetPerson(FamilyCaller caller, Guid profileId)
    {
        var now = timeProvider.GetUtcNow();
        var person = await profileAccessor.GetProfile(caller.FamilyId, profileId, now);

        return person is null ? Result<PersonModel>.NotFound() : ToModel(caller, person, now);
    }

    public async Task<Result<PersonModel>> CreatePerson(FamilyCaller caller, PersonRequest request)
    {
        var problem = await Validate(caller, request);

        if (problem is not null)
        {
            return Result<PersonModel>.Invalid(problem);
        }

        var id = await profileAccessor.CreatePlaceholder(caller.FamilyId, ToFields(request), caller.ProfileId, timeProvider.GetUtcNow());

        return await GetPerson(caller, id);
    }

    public async Task<Result<PersonModel>> UpdatePerson(FamilyCaller caller, Guid profileId, PersonRequest request)
    {
        var existing = await profileAccessor.GetProfile(caller.FamilyId, profileId, timeProvider.GetUtcNow());

        if (existing is null)
        {
            return Result<PersonModel>.NotFound();
        }

        if (!CanEdit(caller, existing))
        {
            return Result<PersonModel>.Forbidden($"Only {existing.FirstName} or an admin can edit this profile.");
        }

        var problem = await Validate(caller, request);

        if (problem is not null)
        {
            return Result<PersonModel>.Invalid(problem);
        }

        await profileAccessor.UpdateProfile(profileId, ToFields(request));

        return await GetPerson(caller, profileId);
    }

    public async Task<Result<Done>> DeletePerson(FamilyCaller caller, Guid profileId)
    {
        var existing = await profileAccessor.GetProfile(caller.FamilyId, profileId, timeProvider.GetUtcNow());

        if (existing is null)
        {
            return Result<Done>.NotFound();
        }

        if (!existing.IsPlaceholder)
        {
            return Result<Done>.Conflict($"{existing.FirstName} has joined, so their profile can't be deleted.");
        }

        if (!caller.IsAdmin && existing.AddedByProfileId != caller.ProfileId)
        {
            return Result<Done>.Forbidden("Only the person who added this profile, or an admin, can delete it.");
        }

        await profileAccessor.DeletePlaceholder(profileId);

        return Done.Value;
    }

    public async Task<List<RelationshipModel>> GetRelationships(FamilyCaller caller)
    {
        var relationships = await relationshipAccessor.GetRelationships(caller.FamilyId);

        return relationships.Select(ToModel).ToList();
    }

    public async Task<Result<RelationshipModel>> AddRelationship(FamilyCaller caller, AddRelationshipRequest request)
    {
        var found = await profileAccessor.FindProfilesInFamily(caller.FamilyId, [request.FromProfileId, request.ToProfileId]);

        if (!found.Contains(request.FromProfileId) || !found.Contains(request.ToProfileId))
        {
            return Result<RelationshipModel>.NotFound("Both people need to be in this family.");
        }

        if (request.Type == RelationshipType.ParentOf && request.Since is not null)
        {
            return Result<RelationshipModel>.Invalid("A date only applies to spouses.");
        }

        var existing = await relationshipAccessor.GetRelationships(caller.FamilyId);
        var check = treeEngine.CheckNewLink(existing.Select(ToLink).ToList(), request.FromProfileId, request.ToProfileId, request.Type);

        var problem = check switch
        {
            RelationshipCheck.SameProfile => "Someone can't be related to themselves.",
            RelationshipCheck.TooManyParents => "That person already has two parents.",
            RelationshipCheck.AncestryLoop => "That would make someone their own ancestor.",
            RelationshipCheck.ConflictsWithExisting => "Those two are already related in a way that conflicts with this.",
            _ => null
        };

        if (problem is not null)
        {
            return Result<RelationshipModel>.Invalid(problem);
        }

        var added = await relationshipAccessor.AddRelationship(
            caller.FamilyId, request.FromProfileId, request.ToProfileId, request.Type, request.Since);

        return added is null
            ? Result<RelationshipModel>.Conflict("Those two are already linked that way.")
            : ToModel(added);
    }

    public async Task<Result<Done>> RemoveRelationship(FamilyCaller caller, Guid relationshipId)
    {
        // Any member can fix the tree, the same as adding to it
        var relationship = await relationshipAccessor.GetRelationship(caller.FamilyId, relationshipId);

        if (relationship is null)
        {
            return Result<Done>.NotFound();
        }

        await relationshipAccessor.DeleteRelationship(relationshipId);

        return Done.Value;
    }

    public async Task<TreeModel> GetTree(FamilyCaller caller)
    {
        var people = await profileAccessor.GetProfiles(caller.FamilyId, timeProvider.GetUtcNow());
        var relationships = await relationshipAccessor.GetRelationships(caller.FamilyId);

        var tree = treeEngine.Build(people.Select(p => p.Id).ToList(), relationships.Select(ToLink).ToList());

        return new TreeModel
        {
            Generations = tree.Generations,
            People = tree.Nodes
                .Select(n => new TreeNodeModel
                {
                    ProfileId = n.ProfileId,
                    Generation = n.Generation,
                    ParentIds = n.ParentIds,
                    ChildIds = n.ChildIds,
                    SpouseIds = n.SpouseIds,
                    SiblingIds = n.SiblingIds
                })
                .ToList(),
            Relationships = relationships.Select(ToModel).ToList()
        };
    }

    // Your own profile, anyone who hasn't joined yet, or anyone at all for admins
    public static bool CanEdit(FamilyCaller caller, ProfileDto profile) =>
        caller.IsAdmin || profile.Id == caller.ProfileId || profile.IsPlaceholder;

    private async Task<string?> Validate(FamilyCaller caller, PersonRequest request)
    {
        var today = DateOnly.FromDateTime(timeProvider.GetUtcNow().UtcDateTime);

        if (request.BirthDate > today)
        {
            return "Birth date can't be in the future.";
        }

        if (request.DeathDate is not null && request.LifeStatus != LifeStatus.Deceased)
        {
            return "Only someone who has passed away can have a date of death.";
        }

        if (request.DeathDate > today)
        {
            return "Date of death can't be in the future.";
        }

        if (request.BirthDate is { } born && request.DeathDate is { } died && died < born)
        {
            return "Date of death is before the birth date.";
        }

        if (request.PhotoMediaId is { } mediaId &&
            (await mediaAccessor.GetMediaInFamily(caller.FamilyId, [mediaId])).Count == 0)
        {
            return "That photo isn't in this family.";
        }

        return null;
    }

    private static ProfileFieldsDto ToFields(PersonRequest request) => new()
    {
        FirstName = request.FirstName.Trim(),
        LastName = request.LastName.Trim(),
        MaidenName = Blank(request.MaidenName),
        Gender = request.Gender,
        LifeStatus = request.LifeStatus,
        BirthDate = request.BirthDate,
        DeathDate = request.DeathDate,
        Bio = Blank(request.Bio),
        Location = Blank(request.Location),
        PhotoMediaId = request.PhotoMediaId
    };

    private static string? Blank(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private PersonModel ToModel(FamilyCaller caller, ProfileDto profile, DateTimeOffset now) => new()
    {
        Id = profile.Id,
        FirstName = profile.FirstName,
        LastName = profile.LastName,
        MaidenName = profile.MaidenName,
        Gender = profile.Gender,
        LifeStatus = profile.LifeStatus,
        BirthDate = profile.BirthDate,
        DeathDate = profile.DeathDate,
        Bio = profile.Bio,
        Location = profile.Location,
        Photo = profile.PhotoMediaId is { } mediaId
            ? new PhotoModel { MediaId = mediaId, Url = mediaAccessor.GetSignedUrl(mediaId, now) }
            : null,
        IsPlaceholder = profile.IsPlaceholder,
        Role = profile.Role,
        JoinedAt = profile.JoinedAt,
        InviteSentAt = profile.InviteSentAt,
        AddedByProfileId = profile.AddedByProfileId,
        CreatedAt = profile.CreatedAt,
        CanEdit = CanEdit(caller, profile)
    };

    private static RelationshipModel ToModel(RelationshipDto relationship) => new()
    {
        Id = relationship.Id,
        FromProfileId = relationship.FromProfileId,
        ToProfileId = relationship.ToProfileId,
        Type = relationship.Type,
        Since = relationship.Since
    };

    private static RelationshipLink ToLink(RelationshipDto relationship) =>
        new(relationship.FromProfileId, relationship.ToProfileId, relationship.Type);
}
