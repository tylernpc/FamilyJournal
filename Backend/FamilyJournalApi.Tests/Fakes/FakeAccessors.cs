using FamilyJournalApi.Accessors;
using FamilyJournalApi.Accessors.DTOs;
using FamilyJournalApi.Common.Enum;
using FamilyJournalApi.Managers.Events;

namespace FamilyJournalApi.Tests.Fakes;

public class FakeProfileAccessor(FakeDatabase db) : IProfileAccessor
{
    public Task<List<ProfileDto>> GetProfiles(Guid familyId, DateTimeOffset now) =>
        Task.FromResult(db.Profiles.Values
            .Where(p => p.FamilyId == familyId)
            .Select(p => db.View(familyId, p.Id, now)!)
            .ToList());

    public Task<ProfileDto?> GetProfile(Guid familyId, Guid profileId, DateTimeOffset now) =>
        Task.FromResult(db.View(familyId, profileId, now));

    public Task<HashSet<Guid>> FindProfilesInFamily(Guid familyId, IEnumerable<Guid> profileIds) =>
        Task.FromResult(profileIds
            .Where(id => db.Profiles.TryGetValue(id, out var p) && p.FamilyId == familyId)
            .ToHashSet());

    public Task<Guid> CreatePlaceholder(Guid familyId, ProfileFieldsDto fields, Guid addedByProfileId, DateTimeOffset createdAt)
    {
        var profile = db.AddProfile(familyId, fields.FirstName, fields.LastName, addedBy: addedByProfileId, createdAt: createdAt);
        Apply(profile, fields);
        return Task.FromResult(profile.Id);
    }

    public Task UpdateProfile(Guid profileId, ProfileFieldsDto fields)
    {
        Apply(db.Profiles[profileId], fields);
        return Task.CompletedTask;
    }

    public Task DeletePlaceholder(Guid profileId)
    {
        db.Relationships.RemoveAll(r => r.FromProfileId == profileId || r.ToProfileId == profileId);
        db.Profiles.Remove(profileId);
        return Task.CompletedTask;
    }

    private static void Apply(ProfileDto profile, ProfileFieldsDto fields)
    {
        profile.FirstName = fields.FirstName;
        profile.LastName = fields.LastName;
        profile.MaidenName = fields.MaidenName;
        profile.Gender = fields.Gender;
        profile.LifeStatus = fields.LifeStatus;
        profile.BirthDate = fields.BirthDate;
        profile.DeathDate = fields.DeathDate;
        profile.Bio = fields.Bio;
        profile.Location = fields.Location;
        profile.PhotoMediaId = fields.PhotoMediaId;
    }
}

public class FakeRelationshipAccessor(FakeDatabase db) : IRelationshipAccessor
{
    public Task<List<RelationshipDto>> GetRelationships(Guid familyId) => Task.FromResult(db.Relationships.ToList());

    public Task<RelationshipDto?> AddRelationship(Guid familyId, Guid fromProfileId, Guid toProfileId, RelationshipType type, DateOnly? since)
    {
        // Mirrors UX_Relationships_FamilyId_Pair_Type: same pair and type, either direction
        var duplicate = db.Relationships.Any(r => r.Type == type &&
            ((r.FromProfileId == fromProfileId && r.ToProfileId == toProfileId) ||
             (r.FromProfileId == toProfileId && r.ToProfileId == fromProfileId)));

        if (duplicate)
        {
            return Task.FromResult<RelationshipDto?>(null);
        }

        var relationship = new RelationshipDto
        {
            Id = Guid.NewGuid(),
            FromProfileId = fromProfileId,
            ToProfileId = toProfileId,
            Type = type,
            Since = since
        };

        db.Relationships.Add(relationship);
        return Task.FromResult<RelationshipDto?>(relationship);
    }

    public Task<RelationshipDto?> GetRelationship(Guid familyId, Guid relationshipId) =>
        Task.FromResult(db.Relationships.SingleOrDefault(r => r.Id == relationshipId));

    public Task DeleteRelationship(Guid relationshipId)
    {
        db.Relationships.RemoveAll(r => r.Id == relationshipId);
        return Task.CompletedTask;
    }
}

public class FakeMediaAccessor(FakeDatabase db) : IMediaAccessor
{
    public Task<MediaDto> SaveMedia(Guid familyId, Guid uploadedByProfileId, Stream content, string contentType, int width, int height, DateTimeOffset createdAt)
    {
        var media = new MediaDto
        {
            Id = Guid.NewGuid(),
            FamilyId = familyId,
            UploadedByProfileId = uploadedByProfileId,
            ContentType = contentType,
            ByteSize = content.Length,
            Width = width,
            Height = height,
            StorageKey = "fake",
            CreatedAt = createdAt
        };

        db.Media[media.Id] = media;
        return Task.FromResult(media);
    }

    public Task<MediaDto?> GetMedia(Guid mediaId) => Task.FromResult(db.Media.GetValueOrDefault(mediaId));

    public Task<List<MediaDto>> GetMediaInFamily(Guid familyId, IEnumerable<Guid> mediaIds) =>
        Task.FromResult(mediaIds.Distinct()
            .Where(id => db.Media.TryGetValue(id, out var m) && m.FamilyId == familyId)
            .Select(id => db.Media[id])
            .ToList());

    public Stream OpenRead(string storageKey) => new MemoryStream();

    public string GetSignedUrl(Guid mediaId, DateTimeOffset now) => $"/api/media/{mediaId}?sig=test";

    public bool IsValidSignature(Guid mediaId, long expiresAtUnix, string signature, DateTimeOffset now) => signature == "test";
}

public class FakeNotificationAccessor : INotificationAccessor
{
    public List<NotificationDto> Notifications { get; } = [];

    public Task CreateNotifications(IEnumerable<NotificationDto> notifications)
    {
        foreach (var n in notifications)
        {
            n.Id = Guid.NewGuid();
            Notifications.Add(n);
        }

        return Task.CompletedTask;
    }

    public Task<List<NotificationDto>> GetNotifications(Guid recipientProfileId, DateTimeOffset? before, int limit) =>
        Task.FromResult(Notifications
            .Where(n => n.RecipientProfileId == recipientProfileId && (before is null || n.CreatedAt < before))
            .OrderByDescending(n => n.CreatedAt)
            .Take(limit)
            .ToList());

    public Task<int> CountUnread(Guid recipientProfileId) =>
        Task.FromResult(Notifications.Count(n => n.RecipientProfileId == recipientProfileId && !n.IsRead));

    public Task DeleteUnread(NotificationType type, Guid actorProfileId, Guid postId)
    {
        Notifications.RemoveAll(n => n.Type == type && n.ActorProfileId == actorProfileId && n.PostId == postId && !n.IsRead);
        return Task.CompletedTask;
    }

    public Task MarkRead(Guid recipientProfileId, IReadOnlyCollection<Guid>? notificationIds)
    {
        foreach (var n in Notifications.Where(n => n.RecipientProfileId == recipientProfileId && (notificationIds is null || notificationIds.Contains(n.Id))))
        {
            n.IsRead = true;
        }

        return Task.CompletedTask;
    }
}

public class FakeEventPublisher : IEventPublisher
{
    public List<object> Published { get; } = [];

    public Task Publish<T>(T message) where T : class
    {
        Published.Add(message);
        return Task.CompletedTask;
    }
}
