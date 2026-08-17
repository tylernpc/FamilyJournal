using FamilyJournalApi.Common;

namespace FamilyJournalApi.Accessors.Entities;

public class Post : IdGeneratedModel
{
    public Guid FamilyId { get; set; }

    public Guid AuthorProfileId { get; set; }

    public string Content { get; set; }

    public string? MediaUrl { get; set; }

    public bool IsLifeEvent { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset? UpdatedAt { get; set; }

    public Family Family { get; set; } = null!;

    public Profile AuthorProfile { get; set; } = null!;

    public ICollection<Comment> Comments { get; set; } = new List<Comment>();

    public ICollection<Reaction> Reactions { get; set; } = new List<Reaction>();
}
