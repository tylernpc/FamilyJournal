using FamilyJournalApi.Common;

namespace FamilyJournalApi.Accessors.Entities;

/// <summary>
/// An uploaded photo. The bytes live in media storage under StorageKey.
/// </summary>
public class Media : IdGeneratedModel
{
    public Guid FamilyId { get; set; }

    public Guid UploadedByProfileId { get; set; }

    public string ContentType { get; set; } = string.Empty;

    public long ByteSize { get; set; }

    public int Width { get; set; }

    public int Height { get; set; }

    public string StorageKey { get; set; } = string.Empty;

    public DateTimeOffset CreatedAt { get; set; }
}
