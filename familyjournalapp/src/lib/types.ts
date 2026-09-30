// What the components work with. src/lib/api/map.ts builds these from the API's models,
// so components don't depend on the wire format.

export type LifeStatus = "living" | "deceased";

export type MemberRole = "admin" | "member";

export type Gender = "unspecified" | "female" | "male" | "nonBinary";

// A rectangle inside a photo, as fractions (0 to 1) of its width and height.
export type CropRect = { x: number; y: number; width: number; height: number };

// How each place frames a photo. The stored photo stays whole; missing crops show all of it.
export type PhotoCrops = { post?: CropRect; portrait?: CropRect; avatar?: CropRect };

export type CropName = keyof PhotoCrops;

export type Photo = {
  // Set for photos stored by the API; absent for local previews that haven't uploaded yet.
  mediaId?: string;
  src: string;
  alt: string;
  // Of the whole photo
  width: number;
  height: number;
  crops?: PhotoCrops;
};

export type Person = {
  id: string;
  firstName: string;
  lastName: string;
  maidenName?: string;
  gender: Gender;
  // Shorthand for gendered wording ("grandmother" vs "grandfather"); neutral words otherwise.
  sex?: "f" | "m";
  birthDate?: string;
  deathDate?: string;
  lifeStatus: LifeStatus;
  bio?: string;
  photo?: Photo;
  location?: string;
  // Placeholders are people added by someone else who haven't claimed the profile.
  isPlaceholder: boolean;
  addedBy?: string;
  inviteSentAt?: string;
  role?: MemberRole;
  joinedAt?: string;
  canEdit: boolean;
};

export type RelationshipType = "parentOf" | "spouseOf";

export type Relationship = {
  id: string;
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
  canDelete: boolean;
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

export type Post = {
  id: string;
  authorId: string;
  createdAt: string;
  updatedAt?: string;
  text: string;
  photos: Photo[];
  tagged: string[];
  lifeEvent?: LifeEvent;
  reactions: Reaction[];
  // The latest few; commentCount has the total.
  comments: Comment[];
  commentCount: number;
  canEdit: boolean;
  canDelete: boolean;
};

export type NotificationType =
  | "postCreated"
  | "commentAdded"
  | "reactionAdded"
  | "memberJoined"
  | "memberTagged"
  | "mentioned";

export type AppNotification = {
  id: string;
  type: NotificationType;
  actorId?: string;
  postId?: string;
  createdAt: string;
  read: boolean;
  preview?: string;
  emoji?: string;
  thumb?: string;
};

export type FeedPage = { posts: Post[]; nextBefore: string | null };

// The signed-in person's place in the family they're viewing.
export type Viewer = {
  userId: string;
  profileId: string;
  role: MemberRole;
  email: string;
};

export type FamilySummary = { id: string; name: string };

export type Invite = {
  id: string;
  email?: string;
  role: MemberRole;
  profileId?: string;
  invitedBy?: string;
  createdAt: string;
  expiresAt: string;
};
