namespace FamilyJournalApi.Managers.Events;

// Published by managers, consumed by NotificationManager. Keep these small and immutable:
// they're the contract between managers, and later between processes.

public record PostCreated(
    Guid FamilyId,
    Guid PostId,
    Guid AuthorProfileId,
    IReadOnlyList<Guid> TaggedProfileIds,
    string Preview,
    DateTimeOffset CreatedAt);

public record CommentAdded(
    Guid FamilyId,
    Guid PostId,
    Guid CommentId,
    Guid AuthorProfileId,
    Guid PostAuthorProfileId,
    IReadOnlyList<Guid> MentionedProfileIds,
    string Preview,
    DateTimeOffset CreatedAt);

public record ReactionAdded(
    Guid FamilyId,
    Guid PostId,
    Guid ReactorProfileId,
    Guid PostAuthorProfileId,
    string Emoji,
    DateTimeOffset CreatedAt);

public record MemberJoined(
    Guid FamilyId,
    Guid ProfileId,
    DateTimeOffset JoinedAt);
