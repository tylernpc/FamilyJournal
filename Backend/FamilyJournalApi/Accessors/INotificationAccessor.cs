using FamilyJournalApi.Accessors.DTOs;
using FamilyJournalApi.Common.Enum;

namespace FamilyJournalApi.Accessors;

public interface INotificationAccessor
{
    Task CreateNotifications(IEnumerable<NotificationDto> notifications);

    /// <summary>
    /// Newest first; pass the CreatedAt of the last one you have as <paramref name="before"/> for the next page.
    /// </summary>
    Task<List<NotificationDto>> GetNotifications(Guid recipientProfileId, DateTimeOffset? before, int limit);

    Task<int> CountUnread(Guid recipientProfileId);

    /// <summary>
    /// Removes unread notifications of this kind from this person about this post, e.g. a reaction they since changed.
    /// </summary>
    Task DeleteUnread(NotificationType type, Guid actorProfileId, Guid postId);

    /// <summary>
    /// Marks the given notifications read, or all of them when <paramref name="notificationIds"/> is null.
    /// </summary>
    Task MarkRead(Guid recipientProfileId, IReadOnlyCollection<Guid>? notificationIds);
}
