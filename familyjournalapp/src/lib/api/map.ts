// API models → the shapes components use. Runs on the server; its output crosses to client components.

import type { LifeEventType } from "../life-events";
import type {
  AppNotification,
  Comment,
  FeedPage,
  Gender,
  Invite,
  MemberRole,
  NotificationType,
  Person,
  Photo,
  Post,
  Relationship,
} from "../types";
import type { components } from "./schema";

type S = components["schemas"];

const lowerFirst = <T extends string>(s: T) =>
  (s.charAt(0).toLowerCase() + s.slice(1)) as Uncapitalize<T>;

const opt = <T>(value: T | null | undefined) => value ?? undefined;

export const toRole = (role: S["MemberRole"]): MemberRole => lowerFirst(role);

export const toGender = (gender: S["Gender"]): Gender => lowerFirst(gender);

export function toPhoto(photo: S["PhotoModel"], alt = ""): Photo {
  return {
    mediaId: photo.mediaId,
    src: photo.url,
    alt: photo.altText ?? alt,
    width: photo.width,
    height: photo.height,
  };
}

export function toPerson(p: S["PersonModel"]): Person {
  const gender = toGender(p.gender);
  const name = `${p.firstName} ${p.lastName}`.trim();
  return {
    id: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
    maidenName: opt(p.maidenName),
    gender,
    sex: gender === "female" ? "f" : gender === "male" ? "m" : undefined,
    birthDate: opt(p.birthDate),
    deathDate: opt(p.deathDate),
    lifeStatus: p.lifeStatus === "Deceased" ? "deceased" : "living",
    bio: opt(p.bio),
    photo: p.photo ? toPhoto(p.photo, name) : undefined,
    location: opt(p.location),
    isPlaceholder: p.isPlaceholder,
    addedBy: opt(p.addedByProfileId),
    inviteSentAt: opt(p.inviteSentAt),
    role: p.role ? toRole(p.role) : undefined,
    joinedAt: opt(p.joinedAt),
    canEdit: p.canEdit,
  };
}

export function toRelationship(r: S["RelationshipModel"]): Relationship {
  return {
    id: r.id,
    from: r.fromProfileId,
    to: r.toProfileId,
    type: r.type === "SpouseOf" ? "spouseOf" : "parentOf",
    since: opt(r.since),
  };
}

export function toComment(c: S["CommentModel"]): Comment {
  return {
    id: c.id,
    authorId: c.authorProfileId,
    text: c.text,
    createdAt: c.createdAt,
    canDelete: c.canDelete,
  };
}

export const toReactions = (reactions: S["ReactionModel"][]) =>
  reactions.map((r) => ({ personId: r.profileId, emoji: r.emoji }));

export function toPost(p: S["PostModel"]): Post {
  return {
    id: p.id,
    authorId: p.authorProfileId,
    createdAt: p.createdAt,
    updatedAt: opt(p.updatedAt),
    text: p.text,
    photos: p.photos.map((photo) => toPhoto(photo)),
    tagged: p.taggedProfileIds,
    lifeEvent: p.lifeEvent
      ? {
          type: p.lifeEvent.type as LifeEventType,
          label: opt(p.lifeEvent.label),
          title: p.lifeEvent.title,
          date: p.lifeEvent.date ?? p.createdAt.slice(0, 10),
        }
      : undefined,
    reactions: toReactions(p.reactions),
    comments: p.latestComments.map(toComment),
    commentCount: p.commentCount,
    canEdit: p.canEdit,
    canDelete: p.canDelete,
  };
}

export const toFeedPage = (page: S["FeedPageModel"]): FeedPage => ({
  posts: page.posts.map(toPost),
  nextBefore: page.nextBefore,
});

export function toNotification(n: S["NotificationModel"]): AppNotification {
  return {
    id: n.id,
    type: lowerFirst(n.type) as NotificationType,
    actorId: opt(n.actorProfileId),
    postId: opt(n.postId),
    createdAt: n.createdAt,
    read: n.isRead,
    preview: opt(n.preview),
    emoji: opt(n.emoji),
    thumb: opt(n.postPhotoUrl),
  };
}

export function toInvite(i: S["InviteModel"]): Invite {
  return {
    id: i.id,
    email: opt(i.email),
    role: toRole(i.role),
    profileId: opt(i.profileId),
    invitedBy: opt(i.invitedByProfileId),
    createdAt: i.createdAt,
    expiresAt: i.expiresAt,
  };
}
