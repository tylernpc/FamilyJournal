using FamilyJournalApi.Common;

namespace FamilyJournalApi.Accessors.Entities;

public class Post : IdGeneratedModel
{
    public Guid FamilyId { get; set; }

    public Guid AuthorProfileId { get; set; }

    public string Content { get; set; } = string.Empty;

    // Kept in step with LifeEventType so older queries on the flag stay correct
    public bool IsLifeEvent { get; set; }

    // A key from LifeEventTypes, or "custom" with LifeEventLabel naming it
    public string? LifeEventType { get; set; }

    public string? LifeEventLabel { get; set; }

    public string? LifeEventTitle { get; set; }

    public DateOnly? LifeEventDate { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset? UpdatedAt { get; set; }

    public Family Family { get; set; } = null!;

    public Profile AuthorProfile { get; set; } = null!;

    public ICollection<PostPhoto> Photos { get; set; } = new List<PostPhoto>();

    public ICollection<PostTag> Tags { get; set; } = new List<PostTag>();

    public ICollection<Comment> Comments { get; set; } = new List<Comment>();

    public ICollection<Reaction> Reactions { get; set; } = new List<Reaction>();
}

public class PostPhoto
{
    public Guid PostId { get; set; }

    public Guid MediaId { get; set; }

    public int SortOrder { get; set; }

    public string? AltText { get; set; }

    public Post Post { get; set; } = null!;

    public Media Media { get; set; } = null!;
}

public class PostTag
{
    public Guid PostId { get; set; }

    public Guid ProfileId { get; set; }

    public Post Post { get; set; } = null!;

    public Profile Profile { get; set; } = null!;
}
