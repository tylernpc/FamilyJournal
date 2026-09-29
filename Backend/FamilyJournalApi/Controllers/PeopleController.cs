using FamilyJournalApi.Managers;
using FamilyJournalApi.Managers.Models;
using Microsoft.AspNetCore.Mvc;

namespace FamilyJournalApi.Controllers;

/// <summary>
/// People in the family, how they're related, and the tree.
/// </summary>
public class PeopleController(IProfileManager profileManager) : FamilyControllerBase
{
    [HttpGet("people")]
    [ProducesResponseType<List<PersonModel>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<List<PersonModel>>> GetPeople() => await profileManager.GetPeople(Caller);

    [HttpGet("people/{profileId:guid}")]
    [ProducesResponseType<PersonModel>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PersonModel>> GetPerson(Guid profileId) =>
        Respond(await profileManager.GetPerson(Caller, profileId));

    [HttpPost("people")]
    [ProducesResponseType<PersonModel>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<PersonModel>> CreatePerson(PersonRequest request)
    {
        var result = await profileManager.CreatePerson(Caller, request);

        return result.Succeeded
            ? CreatedAtAction(nameof(GetPerson), new { familyId = Caller.FamilyId, profileId = result.Value!.Id }, result.Value)
            : Failure(result.Error!.Value, result.Message);
    }

    [HttpPut("people/{profileId:guid}")]
    [ProducesResponseType<PersonModel>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<PersonModel>> UpdatePerson(Guid profileId, PersonRequest request) =>
        Respond(await profileManager.UpdatePerson(Caller, profileId, request));

    [HttpDelete("people/{profileId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> DeletePerson(Guid profileId) =>
        RespondNoContent(await profileManager.DeletePerson(Caller, profileId));

    [HttpGet("relationships")]
    [ProducesResponseType<List<RelationshipModel>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<List<RelationshipModel>>> GetRelationships() =>
        await profileManager.GetRelationships(Caller);

    [HttpPost("relationships")]
    [ProducesResponseType<RelationshipModel>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<RelationshipModel>> AddRelationship(AddRelationshipRequest request) =>
        Respond(await profileManager.AddRelationship(Caller, request));

    [HttpDelete("relationships/{relationshipId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RemoveRelationship(Guid relationshipId) =>
        RespondNoContent(await profileManager.RemoveRelationship(Caller, relationshipId));

    [HttpGet("tree")]
    [ProducesResponseType<TreeModel>(StatusCodes.Status200OK)]
    public async Task<ActionResult<TreeModel>> GetTree() => await profileManager.GetTree(Caller);
}
