using System.ComponentModel.DataAnnotations;
using FamilyJournalApi.Common.Enum;

namespace FamilyJournalApi.Managers.Models;

public class PostModel
{
    public Guid Id { get; set; }

    public Guid AuthorProfileId { get; set; }

    public string Text { get; set; } = string.Empty;

    public LifeEventModel? LifeEvent { get; set; }

    public List<PhotoModel> Photos { get; set; } = [];

    public List<Guid> TaggedProfileIds { get; set; } = [];

    public List<ReactionModel> Reactions { get; set; } = [];

    public int CommentCount { get; set; }

    // The last two, oldest first; GET .../comments has the rest
    public List<CommentModel> LatestComments { get; set; } = [];

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset? UpdatedAt { get; set; }

    public bool CanEdit { get; set; }

    public bool CanDelete { get; set; }
}

public class LifeEventModel
{
    // A key like "newJob", or "custom"
    [Required]
    [StringLength(40)]
    public string Type { get; set; } = string.Empty;

    // For custom events: what to call it
    [StringLength(40)]
    public string? Label { get; set; }

    [Required]
    [StringLength(80, MinimumLength = 1)]
    public string Title { get; set; } = string.Empty;

    // Nullable so a missing date fails validation instead of defaulting to year 1
    [Required]
    public DateOnly? Date { get; set; }
}

public class ReactionModel
{
    public Guid ProfileId { get; set; }

    public string Emoji { get; set; } = string.Empty;
}

public class CommentModel
{
    public Guid Id { get; set; }

    public Guid AuthorProfileId { get; set; }

    public string Text { get; set; } = string.Empty;

    public List<Guid> MentionedProfileIds { get; set; } = [];

    public DateTimeOffset CreatedAt { get; set; }

    public bool CanDelete { get; set; }
}

public class FeedPageModel
{
    public List<PostModel> Posts { get; set; } = [];

    // Pass as ?before= for the next page; null when there's nothing older
    public DateTimeOffset? NextBefore { get; set; }
}

public class PostRequest
{
    [StringLength(5000)]
    public string Text { get; set; } = string.Empty;

    [MaxLength(50)]
    public List<Guid> TaggedProfileIds { get; set; } = [];

    [MaxLength(20)]
    public List<PostPhotoRequest> Photos { get; set; } = [];

    public LifeEventModel? LifeEvent { get; set; }
}

public class PostPhotoRequest
{
    [Required]
    public Guid MediaId { get; set; }

    [StringLength(300)]
    public string? AltText { get; set; }
}

public class ReactionRequest
{
    [Required]
    [StringLength(32)]
    public string Emoji { get; set; } = string.Empty;
}

public class CommentRequest
{
    [Required]
    [StringLength(2000, MinimumLength = 1)]
    public string Text { get; set; } = string.Empty;

    // People picked from the @ autocomplete
    [MaxLength(20)]
    public List<Guid> MentionedProfileIds { get; set; } = [];
}

public class MediaModel
{
    public Guid Id { get; set; }

    public string Url { get; set; } = string.Empty;

    public string ContentType { get; set; } = string.Empty;

    public int Width { get; set; }

    public int Height { get; set; }
}

public class NotificationModel
{
    public Guid Id { get; set; }

    public NotificationType Type { get; set; }

    public Guid? ActorProfileId { get; set; }

    public Guid? PostId { get; set; }

    public string? Emoji { get; set; }

    public string? Preview { get; set; }

    // The post's first photo, signed and temporary
    public string? PostPhotoUrl { get; set; }

    public bool IsRead { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
}

public class NotificationPageModel
{
    public List<NotificationModel> Notifications { get; set; } = [];

    public int UnreadCount { get; set; }

    public DateTimeOffset? NextBefore { get; set; }
}

public class MarkReadRequest
{
    // Leave out to mark everything read
    public List<Guid>? NotificationIds { get; set; }
}

public record PhotoFile(Stream Content, string ContentType);
