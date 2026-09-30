"use server";

import { refresh, revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { toComment, toFeedPage, toPerson, toReactions } from "@/lib/api/map";
import type { components } from "@/lib/api/schema";
import { ApiError, api, attempt, isGuid, unwrap } from "@/lib/server/api";
import type { LifeEvent, MemberRole, PhotoCrops, RelationshipType } from "@/lib/types";

// Everything here is callable by anyone who can reach the server, so ids are checked for shape and the
// API decides what the signed-in person may do. Actions that change what the layout shows (people,
// the unread count) call refresh() so the page re-renders with the change in the same round trip.

type S = components["schemas"];

function ids(...values: unknown[]) {
  if (!values.every(isGuid)) throw new ApiError(400, "That link doesn't look right.");
}

const inFamily = (familyId: string) => ({ params: { path: { familyId } } });

// Goes to another page in the family after a change. The family layout (people, unread count) stays
// mounted across pages, so it has to be marked stale too or it would show the old data.
function leaveFor(path: string): never {
  revalidatePath("/f/[familyId]", "layout");
  redirect(path);
}

const capitalized = <T extends string>(s: T) => (s.charAt(0).toUpperCase() + s.slice(1)) as Capitalize<T>;

// ---------------------------------------------------------------------------
// Posts

export async function loadPosts(familyId: string, profileId: string | null, before: string) {
  return attempt(async () => {
    ids(familyId, ...(profileId ? [profileId] : []));
    const page = await unwrap(
      api.GET("/api/families/{familyId}/posts", {
        params: { path: { familyId }, query: { profileId: profileId ?? undefined, before, limit: 20 } },
      }),
    );
    return toFeedPage(page);
  });
}

export type PostDraft = {
  text: string;
  tagged: string[];
  photos: { mediaId: string; alt?: string }[];
  lifeEvent?: LifeEvent;
};

function postRequest(draft: PostDraft): S["PostRequest"] {
  return {
    text: draft.text,
    taggedProfileIds: draft.tagged,
    photos: draft.photos.map((p) => ({ mediaId: p.mediaId, altText: p.alt || null })),
    lifeEvent: draft.lifeEvent
      ? {
          type: draft.lifeEvent.type,
          label: draft.lifeEvent.label || null,
          title: draft.lifeEvent.title,
          date: draft.lifeEvent.date,
        }
      : null,
  };
}

export async function createPost(familyId: string, draft: PostDraft) {
  const result = await attempt(async () => {
    ids(familyId, ...draft.tagged, ...draft.photos.map((p) => p.mediaId));
    await unwrap(api.POST("/api/families/{familyId}/posts", { ...inFamily(familyId), body: postRequest(draft) }));
  });
  if (result.ok) refresh();
  return result;
}

export async function updatePost(familyId: string, postId: string, draft: PostDraft) {
  const result = await attempt(async () => {
    ids(familyId, postId, ...draft.tagged, ...draft.photos.map((p) => p.mediaId));
    await unwrap(
      api.PUT("/api/families/{familyId}/posts/{postId}", {
        params: { path: { familyId, postId } },
        body: postRequest(draft),
      }),
    );
  });
  if (result.ok) refresh();
  return result;
}

export async function deletePost(familyId: string, postId: string, leavingPostPage = false) {
  const result = await attempt(async () => {
    ids(familyId, postId);
    await unwrap(
      api.DELETE("/api/families/{familyId}/posts/{postId}", { params: { path: { familyId, postId } } }),
    );
  });
  if (result.ok && leavingPostPage) leaveFor(`/f/${familyId}`);
  if (result.ok) refresh();
  return result;
}

// Sets your reaction, or clears it with null. Returns everyone's reactions.
export async function react(familyId: string, postId: string, emoji: string | null) {
  return attempt(async () => {
    ids(familyId, postId);
    const params = { params: { path: { familyId, postId } } };
    const reactions = await unwrap(
      emoji
        ? api.PUT("/api/families/{familyId}/posts/{postId}/reaction", { ...params, body: { emoji } })
        : api.DELETE("/api/families/{familyId}/posts/{postId}/reaction", params),
    );
    return toReactions(reactions);
  });
}

export async function addComment(familyId: string, postId: string, text: string, mentioned: string[]) {
  return attempt(async () => {
    ids(familyId, postId, ...mentioned);
    const comment = await unwrap(
      api.POST("/api/families/{familyId}/posts/{postId}/comments", {
        params: { path: { familyId, postId } },
        body: { text, mentionedProfileIds: mentioned },
      }),
    );
    return toComment(comment);
  });
}

export async function deleteComment(familyId: string, postId: string, commentId: string) {
  const result = await attempt(async () => {
    ids(familyId, postId, commentId);
    await unwrap(
      api.DELETE("/api/families/{familyId}/posts/{postId}/comments/{commentId}", {
        params: { path: { familyId, postId, commentId } },
      }),
    );
  });
  if (result.ok) refresh();
  return result;
}

// ---------------------------------------------------------------------------
// Photos

// Reframes a stored photo: the photo itself doesn't change, only how each place crops it.
export async function setPhotoCrops(familyId: string, mediaId: string, crops: PhotoCrops | null, refreshPage = true) {
  const result = await attempt(async () => {
    ids(familyId, mediaId);
    await unwrap(
      api.PUT("/api/families/{familyId}/media/{mediaId}/crops", {
        params: { path: { familyId, mediaId } },
        body: {
          crops: crops && {
            post: crops.post ?? null,
            portrait: crops.portrait ?? null,
            avatar: crops.avatar ?? null,
          },
        },
      }),
    );
  });
  if (result.ok && refreshPage) refresh();
  return result;
}

// ---------------------------------------------------------------------------
// People

export type PersonDraft = {
  firstName: string;
  lastName: string;
  maidenName: string;
  gender: "unspecified" | "female" | "male" | "nonBinary";
  living: boolean;
  birthDate: string;
  deathDate: string;
  bio: string;
  location: string;
  photoMediaId: string | null;
};

// How a new person connects to someone already in the tree.
export type NewLink = { to: string; as: "parent" | "child" | "spouse" };

function personRequest(d: PersonDraft): S["PersonRequest"] {
  const blank = (s: string) => s.trim() || null;
  return {
    firstName: d.firstName.trim(),
    lastName: d.lastName.trim(),
    maidenName: blank(d.maidenName),
    gender: capitalized(d.gender),
    lifeStatus: d.living ? "Living" : "Deceased",
    birthDate: blank(d.birthDate),
    deathDate: d.living ? null : blank(d.deathDate),
    bio: blank(d.bio),
    location: blank(d.location),
    photoMediaId: d.photoMediaId,
  };
}

// Creates or updates a person. A new person can be linked to someone in the same step.
export async function savePerson(familyId: string, personId: string | null, draft: PersonDraft, link?: NewLink) {
  const result = await attempt(async () => {
    ids(familyId, ...(personId ? [personId] : []), ...(draft.photoMediaId ? [draft.photoMediaId] : []));
    if (!draft.firstName.trim()) throw new ApiError(400, "Add a first name.");
    const body = personRequest(draft);

    if (personId) {
      await unwrap(
        api.PUT("/api/families/{familyId}/people/{profileId}", {
          params: { path: { familyId, profileId: personId } },
          body,
        }),
      );
      return personId;
    }

    const person = toPerson(
      await unwrap(api.POST("/api/families/{familyId}/people", { ...inFamily(familyId), body })),
    );
    if (link) {
      ids(link.to);
      const linked = await attempt(() => linkPeople(familyId, person.id, link));
      // The person exists either way; say what didn't work so it can be linked from their profile.
      if (!linked.ok) throw new ApiError(409, `${person.firstName} was added, but not linked: ${linked.error}`);
    }
    return person.id;
  });
  if (result.ok || result.error.includes("was added")) refresh();
  return result;
}

async function linkPeople(familyId: string, personId: string, link: NewLink, since?: string) {
  const [from, to, type]: [string, string, S["RelationshipType"]] =
    link.as === "parent"
      ? [personId, link.to, "ParentOf"]
      : link.as === "child"
        ? [link.to, personId, "ParentOf"]
        : [personId, link.to, "SpouseOf"];
  await unwrap(
    api.POST("/api/families/{familyId}/relationships", {
      ...inFamily(familyId),
      body: { fromProfileId: from, toProfileId: to, type, since: since || null },
    }),
  );
}

export async function addRelationship(
  familyId: string,
  from: string,
  to: string,
  type: RelationshipType,
  since?: string,
) {
  const result = await attempt(async () => {
    ids(familyId, from, to);
    await unwrap(
      api.POST("/api/families/{familyId}/relationships", {
        ...inFamily(familyId),
        body: {
          fromProfileId: from,
          toProfileId: to,
          type: type === "spouseOf" ? "SpouseOf" : "ParentOf",
          since: since || null,
        },
      }),
    );
  });
  if (result.ok) refresh();
  return result;
}

export async function removeRelationship(familyId: string, relationshipId: string) {
  const result = await attempt(async () => {
    ids(familyId, relationshipId);
    await unwrap(
      api.DELETE("/api/families/{familyId}/relationships/{relationshipId}", {
        params: { path: { familyId, relationshipId } },
      }),
    );
  });
  if (result.ok) refresh();
  return result;
}

export async function deletePerson(familyId: string, personId: string) {
  const result = await attempt(async () => {
    ids(familyId, personId);
    await unwrap(
      api.DELETE("/api/families/{familyId}/people/{profileId}", {
        params: { path: { familyId, profileId: personId } },
      }),
    );
  });
  if (result.ok) leaveFor(`/f/${familyId}/people`);
  return result;
}

// ---------------------------------------------------------------------------
// Invites and members

// Returns the invite link's token, which is only shown this once.
export async function createInvite(
  familyId: string,
  invite: { email: string; profileId: string | null; role: MemberRole },
) {
  const result = await attempt(async () => {
    ids(familyId, ...(invite.profileId ? [invite.profileId] : []));
    const link = await unwrap(
      api.POST("/api/families/{familyId}/invites", {
        ...inFamily(familyId),
        body: { email: invite.email.trim() || null, profileId: invite.profileId, role: capitalized(invite.role) },
      }),
    );
    return link.token;
  });
  if (result.ok) refresh();
  return result;
}

export async function resendInvite(familyId: string, inviteId: string) {
  const result = await attempt(async () => {
    ids(familyId, inviteId);
    const link = await unwrap(
      api.POST("/api/families/{familyId}/invites/{inviteId}/resend", { params: { path: { familyId, inviteId } } }),
    );
    return link.token;
  });
  if (result.ok) refresh();
  return result;
}

export async function revokeInvite(familyId: string, inviteId: string) {
  const result = await attempt(async () => {
    ids(familyId, inviteId);
    await unwrap(
      api.DELETE("/api/families/{familyId}/invites/{inviteId}", { params: { path: { familyId, inviteId } } }),
    );
  });
  if (result.ok) refresh();
  return result;
}

export async function setRole(familyId: string, profileId: string, role: MemberRole) {
  const result = await attempt(async () => {
    ids(familyId, profileId);
    await unwrap(
      api.PUT("/api/families/{familyId}/members/{profileId}/role", {
        params: { path: { familyId, profileId } },
        body: { role: capitalized(role) },
      }),
    );
  });
  if (result.ok) refresh();
  return result;
}

export async function renameFamily(familyId: string, name: string) {
  const result = await attempt(async () => {
    ids(familyId);
    if (!name.trim()) throw new ApiError(400, "Give the family a name.");
    await unwrap(api.PATCH("/api/families/{familyId}", { ...inFamily(familyId), body: { name: name.trim() } }));
  });
  if (result.ok) refresh();
  return result;
}

// ---------------------------------------------------------------------------
// Notifications

// Marks the given notifications read, or all of them when none are given.
export async function markRead(familyId: string, notificationIds: string[] | null) {
  const result = await attempt(async () => {
    ids(familyId, ...(notificationIds ?? []));
    await unwrap(
      api.POST("/api/families/{familyId}/notifications/read", {
        ...inFamily(familyId),
        body: { notificationIds },
      }),
    );
  });
  if (result.ok) refresh();
  return result;
}
