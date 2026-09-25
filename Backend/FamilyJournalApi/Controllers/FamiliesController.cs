using FamilyJournalApi.Managers;
using FamilyJournalApi.Managers.Models;
using Microsoft.AspNetCore.Mvc;

namespace FamilyJournalApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FamiliesController(IFamilyManager familyManager) : ControllerBase
{
    [HttpPost]
    [ProducesResponseType<FamilyModel>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<FamilyModel>> CreateFamily(CreateFamilyRequest request)
    {
        var family = await familyManager.CreateFamily(request);

        return CreatedAtAction(nameof(GetFamily), new { familyId = family.Id }, family);
    }

    [HttpGet("{familyId:guid}")]
    [ProducesResponseType<FamilyModel>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<FamilyModel>> GetFamily(Guid familyId)
    {
        var family = await familyManager.GetFamily(familyId);

        return family is null ? NotFound() : family;
    }
}
