using FamilyJournalApi.Managers;
using FamilyJournalApi.Managers.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace FamilyJournalApi.Controllers;

/// <summary>
/// The family privacy check (#20), in one place: the signed-in user must have a profile in the
/// {familyId} from the route. Outsiders get 404, so they can't even tell the family exists.
/// </summary>
public class FamilyScopedAttribute() : TypeFilterAttribute(typeof(FamilyAccessFilter));

public class FamilyAccessFilter(IFamilyManager familyManager) : IAsyncActionFilter
{
    public const string RouteKey = "familyId";

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        if (!context.RouteData.Values.TryGetValue(RouteKey, out var raw) || !Guid.TryParse(raw?.ToString(), out var familyId))
        {
            throw new InvalidOperationException($"[FamilyScoped] needs a {{{RouteKey}}} route value.");
        }

        var caller = await familyManager.GetCaller(familyId, context.HttpContext.User.GetUserId());

        if (caller is null)
        {
            context.Result = new ObjectResult(new ProblemDetails
            {
                Status = StatusCodes.Status404NotFound,
                Title = "Not found."
            })
            { StatusCode = StatusCodes.Status404NotFound };
            return;
        }

        context.HttpContext.Items[typeof(FamilyCaller)] = caller;
        await next();
    }
}
