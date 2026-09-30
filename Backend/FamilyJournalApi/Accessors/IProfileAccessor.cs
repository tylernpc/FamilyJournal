using FamilyJournalApi.Accessors.DTOs;

namespace FamilyJournalApi.Accessors;

public interface IProfileAccessor
{
    /// <summary>
    /// Everyone in the family: members and placeholders, with role and invite status.
    /// </summary>
    Task<List<ProfileDto>> GetProfiles(Guid familyId, DateTimeOffset now);

    Task<ProfileDto?> GetProfile(Guid familyId, Guid profileId, DateTimeOffset now);

    /// <summary>
    /// The profile using this photo as its picture, if any.
    /// </summary>
    Task<ProfileDto?> GetProfileWithPhoto(Guid familyId, Guid mediaId, DateTimeOffset now);

    /// <summary>
    /// Which of these ids are profiles in the family.
    /// </summary>
    Task<HashSet<Guid>> FindProfilesInFamily(Guid familyId, IEnumerable<Guid> profileIds);

    /// <summary>
    /// Creates a placeholder: someone in the family who hasn't joined (or never will).
    /// </summary>
    Task<Guid> CreatePlaceholder(Guid familyId, ProfileFieldsDto fields, Guid addedByProfileId, DateTimeOffset createdAt);

    Task UpdateProfile(Guid profileId, ProfileFieldsDto fields);

    /// <summary>
    /// Deletes a placeholder and everything that points at it: relationships, tags, mentions, pending invites.
    /// </summary>
    Task DeletePlaceholder(Guid profileId);
}
