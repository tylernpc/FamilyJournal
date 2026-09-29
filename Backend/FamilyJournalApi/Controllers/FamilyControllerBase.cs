using FamilyJournalApi.Managers.Models;
using Microsoft.AspNetCore.Mvc;

namespace FamilyJournalApi.Controllers;

/// <summary>
/// For controllers under /api/families/{familyId}: every action runs the family access check first.
/// </summary>
[ApiController]
[FamilyScoped]
[Route("api/families/{familyId:guid}")]
public abstract class FamilyControllerBase : ControllerBase
{
    /// <summary>
    /// Who's calling and their role in this family; set by the access check.
    /// </summary>
    protected FamilyCaller Caller => (FamilyCaller)HttpContext.Items[typeof(FamilyCaller)]!;

    protected ActionResult<T> Respond<T>(Result<T> result) =>
        result.Succeeded ? Ok(result.Value) : Failure(result.Error!.Value, result.Message);

    protected IActionResult RespondNoContent(Result<Done> result) =>
        result.Succeeded ? NoContent() : Failure(result.Error!.Value, result.Message);

    protected ObjectResult Failure(ResultError error, string? message) => Problem(
        statusCode: error switch
        {
            ResultError.NotFound => StatusCodes.Status404NotFound,
            ResultError.Forbidden => StatusCodes.Status403Forbidden,
            ResultError.Conflict => StatusCodes.Status409Conflict,
            _ => StatusCodes.Status400BadRequest
        },
        title: message);
}
