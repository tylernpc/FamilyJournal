using FamilyJournalApi.Common;

namespace FamilyJournalApi.Accessors.Entities;

public class Comment : IdGeneratedModel
{
    public Guid PostId { get; set; }

    public Guid AuthorProfileId { get; set; }

    public string Content { get; set; } = string.Empty;

    public DateTimeOffset CreatedAt { get; set; }

    public Post Post { get; set; } = null!;

    public Profile AuthorProfile { get; set; } = null!;

    public ICollection<CommentMention> Mentions { get; set; } = new List<CommentMention>();
}

public class CommentMention
{
    public Guid CommentId { get; set; }

    public Guid ProfileId { get; set; }

    public Comment Comment { get; set; } = null!;
}
