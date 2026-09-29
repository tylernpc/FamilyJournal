using FamilyJournalApi.Accessors.DTOs;
using FamilyJournalApi.Accessors.Entities;
using FamilyJournalApi.Common.Enum;
using Microsoft.EntityFrameworkCore;

namespace FamilyJournalApi.Accessors;

public class NotificationAccessor(DatabaseContext db) : INotificationAccessor
{
    public async Task CreateNotifications(IEnumerable<NotificationDto> notifications)
    {
        db.Notifications.AddRange(notifications.Select(n => new Notification
        {
            RecipientProfileId = n.RecipientProfileId,
            Type = n.Type,
            ActorProfileId = n.ActorProfileId,
            PostId = n.PostId,
            Emoji = n.Emoji,
            Preview = n.Preview,
            CreatedAt = n.CreatedAt
        }));

        await db.SaveChangesAsync();
    }

    public async Task<List<NotificationDto>> GetNotifications(Guid recipientProfileId, DateTimeOffset? before, int limit)
    {
        var query = db.Notifications.AsNoTracking().Where(n => n.RecipientProfileId == recipientProfileId);

        if (before is { } cursor)
        {
            query = query.Where(n => n.CreatedAt < cursor);
        }

        return await query
            .OrderByDescending(n => n.CreatedAt)
            .Take(limit)
            .Select(n => new NotificationDto
            {
                Id = n.Id,
                RecipientProfileId = n.RecipientProfileId,
                Type = n.Type,
                ActorProfileId = n.ActorProfileId,
                PostId = n.PostId,
                Emoji = n.Emoji,
                Preview = n.Preview,
                PostPhotoMediaId = db.PostPhotos
                    .Where(p => p.PostId == n.PostId)
                    .OrderBy(p => p.SortOrder)
                    .Select(p => (Guid?)p.MediaId)
                    .FirstOrDefault(),
                IsRead = n.IsRead,
                CreatedAt = n.CreatedAt
            })
            .ToListAsync();
    }

    public async Task<int> CountUnread(Guid recipientProfileId)
    {
        return await db.Notifications.CountAsync(n => n.RecipientProfileId == recipientProfileId && !n.IsRead);
    }

    public async Task DeleteUnread(NotificationType type, Guid actorProfileId, Guid postId)
    {
        await db.Notifications
            .Where(n => n.Type == type && n.ActorProfileId == actorProfileId && n.PostId == postId && !n.IsRead)
            .ExecuteDeleteAsync();
    }

    public async Task MarkRead(Guid recipientProfileId, IReadOnlyCollection<Guid>? notificationIds)
    {
        var query = db.Notifications.Where(n => n.RecipientProfileId == recipientProfileId && !n.IsRead);

        if (notificationIds is not null)
        {
            query = query.Where(n => notificationIds.Contains(n.Id));
        }

        await query.ExecuteUpdateAsync(set => set.SetProperty(n => n.IsRead, true));
    }
}
