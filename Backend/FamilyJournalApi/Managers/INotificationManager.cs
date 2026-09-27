using FamilyJournalApi.Managers.Events;
using FamilyJournalApi.Managers.Models;

namespace FamilyJournalApi.Managers;

public interface INotificationManager
{
    Task<NotificationPageModel> GetNotifications(FamilyCaller caller, DateTimeOffset? before, int limit);

    Task MarkRead(FamilyCaller caller, IReadOnlyCollection<Guid>? notificationIds);

    // Event handlers: turn what happened into notifications for the right people

    Task Handle(PostCreated message);

    Task Handle(CommentAdded message);

    Task Handle(ReactionAdded message);

    Task Handle(MemberJoined message);
}
