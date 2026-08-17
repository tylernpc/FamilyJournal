# Family Journal — Feature Set & Technical Plan

## Concept

A social media–style family tree app. The top-level container is a **Family**; members add themselves and relatives as **Individuals**, connect them via **Relationships**, and share **Posts** (life events, photos, updates) that the family can react to and comment on. Starting as a web app (Next.js), with mobile (React Native) planned for later.

---

## Core Data Model

* **Family** — top-level container. Name, cover photo, members, privacy settings.
* **Individual/Profile** — a person node. Can be a real registered user *or* a "placeholder" person (e.g., deceased grandparent, young child) added by someone else and later "claimed" by that person if they join.
* **Relationship** — parent/child, spouse/partner, sibling (often inferred from shared parents). Drives the auto-generated tree.
* **Post** — content tied to one or more individuals and/or the family as a whole.
* **Reaction / Comment** — standard social primitives, scoped to family visibility only.

**Design note:** Getting the "placeholder person" concept right early matters a lot — most family tree apps live or die on how gracefully they handle people who aren't on the app themselves.

---

## MVP Feature Set

### 1. Family & Onboarding

* Create a family, invite members via link/email/SMS
* Join flow: accept invite → claim an existing placeholder profile OR create a new one
* Basic roles: admin (creator/family "historian") vs. member

### 2. Individual Profiles

* Name, photo, birthdate, short bio
* Life status (living/deceased) — affects profile display
* Relationship links (parents, spouse, children) — auto-builds the tree

### 3. Family Tree View

* Auto-generated tree from relationship data (derive, don't make users manually place nodes)
* Tap a node → go to that person's profile/timeline
* Simple generational layout (basic vertical/horizontal tree renderer is fine for v1)

### 4. Posts

* Text + photo posts (video deferred)
* Tag one or more family members in a post
* Optional "life event" post type with fixed categories: birth, marriage, graduation, new job, death/memorial, anniversary — visually distinct, later feeds a per-person timeline
* Single visibility tier for MVP: visible to whole family

### 5. Reactions

* Small fixed set to start (like, love, laugh, celebrate) — avoid building custom reaction infrastructure
* Reaction counts + tap to see who reacted

### 6. Comments

* Flat comments (no threaded replies in v1)
* Basic @mention of family members

### 7. Feed

* Reverse-chronological family feed, all posts from all members
* Filter by person (cheap to add once tagging exists)

### 8. Notifications

* New post, reaction/comment on your post, tagged in a post, new family member joined
* In-app only for MVP; push comes with mobile

### 9. Privacy (minimal but necessary)

* Family-level privacy: only invited members can see anything
* No public/discoverable content — closed garden, matches user expectations for family content

---

## Phase 2 (explicitly deferred)

* Multiple families per user (in-laws, blended families) + cross-family relationship linking
* Threaded comments, richer reaction variety, GIFs/stickers
* Per-post granular privacy (e.g., hide from certain branches of the family)
* Rich per-person timeline/"life story" view aggregating tagged posts + events chronologically
* Media albums, video, voice memos
* Anniversary/birthday reminders and auto-generated "on this day" posts
* Collaborative editing of a shared person's profile (e.g., siblings co-editing a deceased parent's page)
* Export/print — a printable/shareable static family tree "poster" (strong differentiator, not required for MVP)
* Search across the tree

**Open product question:** decide whether the "poster" (visual tree as primary artifact) or the "feed" (social feed primary, tree secondary) is the dominant mental model — this affects what the home screen should be.

---

## Mobile (Backgrounded — Not Needed Yet)

* Use **Expo** (not bare React Native) when mobile work starts — fastest path to a real app, OTA updates, less native tooling pain.
* Expo Router mirrors Next.js's file-based routing conventions, easing the transition.
* At that point, build `/apps/mobile` pulling from `/packages/core` and `/packages/types`; write RN-specific UI from scratch.
* Push notifications, offline support, and native camera/photo picker integration become relevant at this stage.
* Multiple families per user, richer media (video/voice), and deep linking are natural to tackle once mobile is active, since they benefit from native capabilities.
