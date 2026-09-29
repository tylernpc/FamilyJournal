// Shapes mirror the backend entities (Profile, Relationship, Post, Reaction, Comment)
// closely enough that swapping the mock data for API calls is a mapping exercise.

export type LifeStatus = "living" | "deceased";

export type MemberRole = "admin" | "member";

export type Person = {
  id: string;
  firstName: string;
  lastName: string;
  maidenName?: string;
  sex?: "f" | "m";
  birthDate?: string;
  deathDate?: string;
  lifeStatus: LifeStatus;
  bio?: string;
  // Unsplash photo id for the mock data; becomes an uploaded media URL later.
  photo?: string;
  location?: string;
  // Placeholders are people added by someone else who haven't claimed the profile.
  isPlaceholder: boolean;
  addedBy?: string;
  inviteSentAt?: string;
  role?: MemberRole;
  joinedAt?: string;
};

export type RelationshipType = "parentOf" | "spouseOf";

export type Relationship = {
  from: string;
  to: string;
  type: RelationshipType;
  since?: string;
};

// Any emoji, stored as its Unicode string (e.g. "❤️", "👍🏽"). One reaction per person per post.
export type Reaction = { personId: string; emoji: string };

export type Comment = {
  id: string;
  authorId: string;
  text: string;
  createdAt: string;
};

export type { LifeEventType } from "./life-events";
import type { LifeEventType } from "./life-events";

export type LifeEvent = {
  type: LifeEventType;
  // Only for type "custom": the name people gave their event.
  label?: string;
  title: string;
  date: string;
};

export type Photo = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

export type Post = {
  id: string;
  authorId: string;
  createdAt: string;
  text: string;
  photos?: Photo[];
  tagged: string[];
  lifeEvent?: LifeEvent;
  reactions: Reaction[];
  comments: Comment[];
};

export type NotificationType =
  | "postCreated"
  | "commentAdded"
  | "reactionAdded"
  | "memberJoined"
  | "memberTagged";

export type AppNotification = {
  id: string;
  type: NotificationType;
  actorId: string;
  postId?: string;
  createdAt: string;
  read: boolean;
  preview?: string;
  emoji?: string;
};
