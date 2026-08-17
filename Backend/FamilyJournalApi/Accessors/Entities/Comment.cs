using FamilyJournalApi.Common;

namespace FamilyJournalApi.Accessors.Entities;

public class Comment : IdGeneratedModel
{
    public Guid PostId { get; set; }

    public Guid AuthorProfileId { get; set; }

    public string Content { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public Post Post { get; set; }

    public Profile AuthorProfile { get; set; }
}
