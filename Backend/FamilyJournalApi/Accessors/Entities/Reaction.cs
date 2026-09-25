using FamilyJournalApi.Common;

namespace FamilyJournalApi.Accessors.Entities;

public class Reaction : IdGeneratedModel
{
    public Guid PostId { get; set; }

    public Guid ProfileId { get; set; }

    // Any emoji as its Unicode string, e.g. "❤️" or "👍🏽".
    public string Emoji { get; set; } = string.Empty;

    public DateTimeOffset CreatedAt { get; set; }

    public Post Post { get; set; } = null!;

    public Profile Profile { get; set; } = null!;
}
