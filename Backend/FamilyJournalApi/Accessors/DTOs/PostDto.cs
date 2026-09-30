using FamilyJournalApi.Common;
using FamilyJournalApi.Common.Enum;

namespace FamilyJournalApi.Accessors.DTOs;

public class PostDto
{
    public Guid Id { get; set; }

    public Guid FamilyId { get; set; }

    public Guid AuthorProfileId { get; set; }

    public string Content { get; set; } = string.Empty;

    public string? LifeEventType { get; set; }

    public string? LifeEventLabel { get; set; }

    public string? LifeEventTitle { get; set; }

    public DateOnly? LifeEventDate { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset? UpdatedAt { get; set; }

    public List<PostPhotoDto> Photos { get; set; } = [];

    public List<Guid> TaggedProfileIds { get; set; } = [];

    public List<ReactionDto> Reactions { get; set; } = [];

    public int CommentCount { get; set; }

    // Oldest first, like they're shown under the post
    public List<CommentDto> LatestComments { get; set; } = [];
}

public class PostPhotoDto
{
    public Guid MediaId { get; set; }

    public int Width { get; set; }

    public int Height { get; set; }

    public string? AltText { get; set; }

    public PhotoCrops? Crops { get; set; }
}

/// <summary>
/// What a post says and shows; used for both creating and editing.
/// </summary>
public class PostContentDto
{
    public string Content { get; set; } = string.Empty;

    public string? LifeEventType { get; set; }

    public string? LifeEventLabel { get; set; }

    public string? LifeEventTitle { get; set; }

    public DateOnly? LifeEventDate { get; set; }

    public List<Guid> TaggedProfileIds { get; set; } = [];

    // In display order
    public List<(Guid MediaId, string? AltText)> Photos { get; set; } = [];
}

public class ReactionDto
{
    public Guid ProfileId { get; set; }

    public string Emoji { get; set; } = string.Empty;

    public DateTimeOffset CreatedAt { get; set; }
}

public class CommentDto
{
    public Guid Id { get; set; }

    public Guid PostId { get; set; }

    public Guid AuthorProfileId { get; set; }

    public string Content { get; set; } = string.Empty;

    public DateTimeOffset CreatedAt { get; set; }

    public List<Guid> MentionedProfileIds { get; set; } = [];
}

public class MediaDto
{
    public Guid Id { get; set; }

    public Guid FamilyId { get; set; }

    public Guid UploadedByProfileId { get; set; }

    public string ContentType { get; set; } = string.Empty;

    public long ByteSize { get; set; }

    public int Width { get; set; }

    public int Height { get; set; }

    public string StorageKey { get; set; } = string.Empty;

    public PhotoCrops? Crops { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
}

public class NotificationDto
{
    public Guid Id { get; set; }

    public Guid RecipientProfileId { get; set; }

    public NotificationType Type { get; set; }

    public Guid? ActorProfileId { get; set; }

    public Guid? PostId { get; set; }

    public string? Emoji { get; set; }

    public string? Preview { get; set; }

    // First photo of the post it's about, for a thumbnail; filled in on read
    public Guid? PostPhotoMediaId { get; set; }

    public bool IsRead { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
}
