using FamilyJournalApi.Accessors.DTOs;
using FamilyJournalApi.Common;

namespace FamilyJournalApi.Accessors;

/// <summary>
/// Photo storage. Hides where the bytes live (local disk today, blob storage later)
/// and how photo URLs stay private.
/// </summary>
public interface IMediaAccessor
{
    Task<MediaDto> SaveMedia(Guid familyId, Guid uploadedByProfileId, Stream content, string contentType, int width, int height, PhotoCrops? crops, DateTimeOffset createdAt);

    /// <summary>
    /// Replaces how the photo is framed; the stored photo itself never changes.
    /// </summary>
    Task SetCrops(Guid mediaId, PhotoCrops? crops);

    Task<MediaDto?> GetMedia(Guid mediaId);

    Task<List<MediaDto>> GetMediaInFamily(Guid familyId, IEnumerable<Guid> mediaIds);

    Stream OpenRead(string storageKey);

    /// <summary>
    /// A URL that serves the photo without a sign-in header (so an img tag can load it), valid for a few hours.
    /// </summary>
    string GetSignedUrl(Guid mediaId, DateTimeOffset now);

    bool IsValidSignature(Guid mediaId, long expiresAtUnix, string signature, DateTimeOffset now);
}
