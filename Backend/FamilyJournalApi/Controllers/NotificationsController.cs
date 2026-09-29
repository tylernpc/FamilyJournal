using FamilyJournalApi.Managers;
using FamilyJournalApi.Managers.Models;
using Microsoft.AspNetCore.Mvc;

namespace FamilyJournalApi.Controllers;

public class NotificationsController(INotificationManager notificationManager) : FamilyControllerBase
{
    [HttpGet("notifications")]
    [ProducesResponseType<NotificationPageModel>(StatusCodes.Status200OK)]
    public async Task<ActionResult<NotificationPageModel>> GetNotifications(DateTimeOffset? before, int limit = 30) =>
        await notificationManager.GetNotifications(Caller, before, limit);

    /// <summary>
    /// Marks the listed notifications read, or all of them when no ids are sent.
    /// </summary>
    [HttpPost("notifications/read")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> MarkRead(MarkReadRequest request)
    {
        await notificationManager.MarkRead(Caller, request.NotificationIds);

        return NoContent();
    }
}
