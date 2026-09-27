using FamilyJournalApi.Managers;
using FamilyJournalApi.Managers.Models;
using Microsoft.AspNetCore.Mvc;

namespace FamilyJournalApi.Controllers;

/// <summary>
/// Creating a family. Everything inside one lives under /api/families/{familyId}.
/// </summary>
[ApiController]
[Route("api/families")]
public class FamiliesController(IFamilyManager familyManager) : ControllerBase
{
    [HttpPost]
    [ProducesResponseType<FamilyModel>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<FamilyModel>> CreateFamily(CreateFamilyRequest request)
    {
        var family = await familyManager.CreateFamily(User.GetUserId(), request);

        if (family is null)
        {
            return Unauthorized();
        }

        return CreatedAtAction(nameof(FamilyController.GetFamily), "Family", new { familyId = family.Id }, family);
    }
}

/// <summary>
/// One family: its name, members' roles, and invites.
/// </summary>
public class FamilyController(IFamilyManager familyManager) : FamilyControllerBase
{
    [HttpGet]
    [ProducesResponseType<FamilyModel>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<FamilyModel>> GetFamily() => await familyManager.GetFamily(Caller);

    [HttpPatch]
    [ProducesResponseType<FamilyModel>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<FamilyModel>> RenameFamily(RenameFamilyRequest request) =>
        Respond(await familyManager.RenameFamily(Caller, request));

    [HttpPut("members/{profileId:guid}/role")]
    [ProducesResponseType<FamilyMemberModel>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<FamilyMemberModel>> SetRole(Guid profileId, SetRoleRequest request) =>
        Respond(await familyManager.SetRole(Caller, profileId, request.Role));

    [HttpPost("invites")]
    [ProducesResponseType<InviteLinkModel>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<InviteLinkModel>> CreateInvite(CreateInviteRequest request) =>
        Respond(await familyManager.CreateInvite(Caller, request));

    [HttpGet("invites")]
    [ProducesResponseType<List<InviteModel>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<List<InviteModel>>> GetInvites() => await familyManager.GetPendingInvites(Caller);

    [HttpPost("invites/{inviteId:guid}/resend")]
    [ProducesResponseType<InviteLinkModel>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<InviteLinkModel>> ResendInvite(Guid inviteId) =>
        Respond(await familyManager.ResendInvite(Caller, inviteId));

    [HttpDelete("invites/{inviteId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RevokeInvite(Guid inviteId) =>
        RespondNoContent(await familyManager.RevokeInvite(Caller, inviteId));
}
