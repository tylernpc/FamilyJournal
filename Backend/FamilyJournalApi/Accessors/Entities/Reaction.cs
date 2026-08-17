using FamilyJournalApi.Common;
using FamilyJournalApi.Common.Enum;

namespace FamilyJournalApi.Accessors.Entities;

public class Reaction : IdGeneratedModel
{
    public Guid PostId { get; set; }

    public Guid ProfileId { get; set; }

    public ReactionType Type { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public Post Post { get; set; } = null!;

    public Profile Profile { get; set; } = null!;
}
