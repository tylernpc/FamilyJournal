using FamilyJournalApi.Accessors;
using FamilyJournalApi.Accessors.DTOs;
using FamilyJournalApi.Common.Enum;
using FamilyJournalApi.Managers.Events;
using FamilyJournalApi.Managers.Models;

namespace FamilyJournalApi.Managers;

/// <summary>
/// In-app notifications. Only people with accounts get them; placeholders have nobody to tell.
/// Each person gets at most one notification per event, the most specific one that applies.
/// </summary>
public class NotificationManager(
    INotificationAccessor notificationAccessor,
    IFamilyAccessor familyAccessor) : INotificationManager
{
    public const int MaxPage = 50;

    public async Task<NotificationPageModel> GetNotifications(FamilyCaller caller, DateTimeOffset? before, int limit)
    {
        limit = Math.Clamp(limit, 1, MaxPage);
        var notifications = await notificationAccessor.GetNotifications(caller.ProfileId, before, limit);

        return new NotificationPageModel
        {
            Notifications = notifications
                .Select(n => new NotificationModel
                {
                    Id = n.Id,
                    Type = n.Type,
                    ActorProfileId = n.ActorProfileId,
                    PostId = n.PostId,
                    Emoji = n.Emoji,
                    Preview = n.Preview,
                    IsRead = n.IsRead,
                    CreatedAt = n.CreatedAt
                })
                .ToList(),
            UnreadCount = await notificationAccessor.CountUnread(caller.ProfileId),
            NextBefore = notifications.Count == limit ? notifications[^1].CreatedAt : null
        };
    }

    public Task MarkRead(FamilyCaller caller, IReadOnlyCollection<Guid>? notificationIds) =>
        notificationAccessor.MarkRead(caller.ProfileId, notificationIds);

    public async Task Handle(PostCreated message)
    {
        var tagged = message.TaggedProfileIds.ToHashSet();

        await Notify(message.FamilyId, message.AuthorProfileId, recipient => new NotificationDto
        {
            // Being tagged is more personal than "someone posted", so it wins
            Type = tagged.Contains(recipient) ? NotificationType.MemberTagged : NotificationType.PostCreated,
            PostId = message.PostId,
            Preview = message.Preview,
            CreatedAt = message.CreatedAt
        });
    }

    public async Task Handle(CommentAdded message)
    {
        var mentioned = message.MentionedProfileIds.ToHashSet();

        await Notify(message.FamilyId, message.AuthorProfileId, recipient =>
            mentioned.Contains(recipient)
                ? new NotificationDto { Type = NotificationType.Mentioned, PostId = message.PostId, Preview = message.Preview, CreatedAt = message.CreatedAt }
                : recipient == message.PostAuthorProfileId
                    ? new NotificationDto { Type = NotificationType.CommentAdded, PostId = message.PostId, Preview = message.Preview, CreatedAt = message.CreatedAt }
                    : null);
    }

    public async Task Handle(ReactionAdded message)
    {
        // Switching 🥧 to 👍 is one reaction, not two: the new one replaces an unread old one
        await notificationAccessor.DeleteUnread(NotificationType.ReactionAdded, message.ReactorProfileId, message.PostId);

        await Notify(message.FamilyId, message.ReactorProfileId, recipient =>
            recipient == message.PostAuthorProfileId
                ? new NotificationDto { Type = NotificationType.ReactionAdded, PostId = message.PostId, Emoji = message.Emoji, CreatedAt = message.CreatedAt }
                : null);
    }

    public async Task Handle(MemberJoined message)
    {
        await Notify(message.FamilyId, message.ProfileId, _ => new NotificationDto
        {
            Type = NotificationType.MemberJoined,
            CreatedAt = message.JoinedAt
        });
    }

    /// <summary>
    /// Builds a notification for each member except the actor; return null to skip someone.
    /// </summary>
    private async Task Notify(Guid familyId, Guid actorProfileId, Func<Guid, NotificationDto?> forRecipient)
    {
        var members = await familyAccessor.GetMembers(familyId);

        var notifications = members
            .Where(m => m.ProfileId != actorProfileId)
            .Select(m => (Recipient: m.ProfileId, Notification: forRecipient(m.ProfileId)))
            .Where(x => x.Notification is not null)
            .Select(x =>
            {
                x.Notification!.RecipientProfileId = x.Recipient;
                x.Notification.ActorProfileId = actorProfileId;
                return x.Notification;
            })
            .ToList();

        if (notifications.Count > 0)
        {
            await notificationAccessor.CreateNotifications(notifications);
        }
    }
}
