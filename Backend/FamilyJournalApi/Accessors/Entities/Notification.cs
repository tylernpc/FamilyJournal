using FamilyJournalApi.Common;
using FamilyJournalApi.Common.Enum;

namespace FamilyJournalApi.Accessors.Entities;

public class Notification : IdGeneratedModel
{
    public Guid RecipientProfileId { get; set; }

    public NotificationType Type { get; set; }

    // Who did the thing
    public Guid? ActorProfileId { get; set; }

    public Guid? PostId { get; set; }

    // For reactions
    public string? Emoji { get; set; }

    // A short quote: the comment, the post, or the life event title
    public string? Preview { get; set; }

    public bool IsRead { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public Profile RecipientProfile { get; set; } = null!;
}
