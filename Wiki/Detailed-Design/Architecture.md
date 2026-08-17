# Family Journal API — Architecture

The API follows **iDesign (The Method)**: components are decomposed by *volatility*, not by feature. Each layer hides a different kind of change.

::: mermaid
flowchart TD
    subgraph CLIENT["🌐 Client Tier"]
        C1[FamiliesController]
        C2[ProfilesController]
        C3[PostsController]
        C4[NotificationsController]
    end

    subgraph MANAGERS["⚙️ Managers — use-case orchestration"]
        M1[FamilyManager]
        M2[ProfileManager]
        M3[PostManager]
        M4[NotificationManager]
    end

    subgraph ENGINES["🧠 Engines — business computation"]
        E1[TreeEngine]
    end

    subgraph ACCESSORS["🗄️ Accessors — resource access"]
        A1[FamilyAccessor]
        A2[ProfileAccessor]
        A3[RelationshipAccessor]
        A4[PostAccessor]
        A5[NotificationAccessor]
        A6[MediaAccessor]
    end

    subgraph RESOURCES["💾 Resources"]
        DB[(SQL Database<br/>EF Core)]
        BLOB[(Blob Storage<br/>photos)]
    end

    BUS{{"MassTransit<br/>(in-memory → broker later)"}}

    C1 --> M1
    C2 --> M2
    C3 --> M3
    C4 --> M4

    M2 --> E1
    M1 --> A1 & A2
    M2 --> A2 & A3
    M3 --> A4 & A6
    M4 --> A5

    M1 -. publishes .-> BUS
    M3 -. publishes .-> BUS
    BUS -. consumes .-> M4

    A1 & A2 & A3 & A4 & A5 --> DB
    A6 --> BLOB

    classDef client fill:#1e6fd9,stroke:#0d4ea3,color:#fff
    classDef manager fill:#7c3aed,stroke:#5b21b6,color:#fff
    classDef engine fill:#d97706,stroke:#92400e,color:#fff
    classDef accessor fill:#059669,stroke:#065f46,color:#fff
    classDef resource fill:#475569,stroke:#1e293b,color:#fff
    classDef bus fill:#dc2626,stroke:#991b1b,color:#fff

    class C1,C2,C3,C4 client
    class M1,M2,M3,M4 manager
    class E1 engine
    class A1,A2,A3,A4,A5,A6 accessor
    class DB,BLOB resource
    class BUS bus
:::

---

## Call Rules

| Rule | Detail |
|---|---|
| ✅ Controller → Manager | Controllers call **one** manager method per endpoint |
| ✅ Manager → Engine | Only where real computation exists |
| ✅ Manager → Accessor | Direct calls are fine — engines are **optional**, not a mandatory hop |
| ✅ Engine → Accessor | Allowed when an engine needs data |
| ❌ Manager → Manager | **Never.** Managers interact only via MassTransit events |
| ❌ Controller → Engine/Accessor | Never skip the manager |
| ❌ Accessor → anything above it | Accessors know nothing about business logic |

---

## 🌐 Controllers (Client Tier)

Thin HTTP adapters: model binding, auth context extraction, call one manager method, map result to HTTP. **No logic.**

Family membership check ("is the caller a member of this family?") is resolved once in shared middleware/filter — it's the entire MVP privacy model, so it lives in exactly one place.

| Controller | Endpoints (MVP) |
|---|---|
| `FamiliesController` | create family, invite, join/claim, members, roles |
| `ProfilesController` | CRUD individuals, relationship links, **tree view** |
| `PostsController` | posts, comments, reactions, feed, photo upload |
| `NotificationsController` | list, mark read |

---

## ⚙️ Managers

One manager per **use-case cluster** — not per entity. Managers own the "what happens when" sequence; this is where workflow volatility lives.

| Manager | Owns | Notes |
|---|---|---|
| `FamilyManager` | Create family, invite links/email, join flow, **placeholder claim**, admin/member roles | The claim flow is the highest-churn workflow — keep it here, fully tested |
| `ProfileManager` | Individuals, placeholders, life status, relationship links | Calls `TreeEngine` for tree derivation |
| `PostManager` | Posts, life-event posts, tagging, comments, reactions, feed query | Comments/reactions are part of the posting use case — no separate managers |
| `NotificationManager` | Materialize notifications from events, unread state | Pure event consumer; push notifications slot in here later |

### Manager-to-Manager Communication — MassTransit

Managers never call each other. They publish events; interested managers consume them.

::: mermaid
sequenceDiagram
    autonumber
    participant PC as PostsController
    participant PM as PostManager
    participant PA as PostAccessor
    participant BUS as MassTransit
    participant NM as NotificationManager
    participant NA as NotificationAccessor

    PC->>PM: CreatePost(dto)
    PM->>PA: SavePost()
    PM-->>BUS: publish PostCreated { postId, authorId, taggedIds }
    PM->>PC: PostDto (returns immediately)
    BUS-->>NM: consume PostCreated
    NM->>NA: CreateNotifications(tagged + family members)
:::

**MVP events:** `PostCreated`, `CommentAdded`, `ReactionAdded`, `MemberJoined`, `MemberTagged`

Start with MassTransit's **in-memory transport**; swap to RabbitMQ/Azure Service Bus when mobile push arrives — no manager code changes.

---

## 🧠 Engines

Engines encapsulate *business computation* — pure logic, heavily unit tested. Only create one when there's a real algorithm. MVP has **one**:

| Engine | Responsibility |
|---|---|
| `TreeEngine` | Builds tree structure from raw relationship rows, **infers siblings from shared parents**, computes generational layout data for the UI |

> Deliberately empty elsewhere: `AddComment`, `React`, etc. are CRUD — forcing engines there creates pass-through boilerplate. Add engines when logic appears (e.g., a future `FeedEngine` for ranked feeds).

---

## 🗄️ Accessors

One accessor per **resource**, exposing atomic *business verbs* — not generic repositories. All EF Core / storage detail is invisible above this line.

| Accessor | Resource | Example verbs |
|---|---|---|
| `FamilyAccessor` | Families, memberships, invites | `CreateFamily`, `AddMember`, `GetInviteByToken` |
| `ProfileAccessor` | Individuals (real + placeholder) | `CreateProfile`, `ClaimProfile`, `SetLifeStatus` |
| `RelationshipAccessor` | Relationship edges | `Link(parent/child/spouse)`, `GetFamilyRelationships` |
| `PostAccessor` | Posts, comments, reactions, tags | `SavePost`, `GetFeedPage`, `AddReaction` |
| `NotificationAccessor` | Notifications | `CreateBatch`, `GetUnread`, `MarkRead` |
| `MediaAccessor` | Photo blobs | `Upload`, `GetSignedUrl` — hides blob-storage choice |

---

## 💾 Solution Structure

Folders in one API project — split into per-layer projects later only if compiler-enforced boundaries become worth it (a mechanical move once interfaces exist).

```
src/
  FamilyJournal.Api/            # host: controllers, DI wiring, middleware, auth
    Controllers/
    Managers/
    Engines/
    Accessors/
  FamilyJournal.Contracts/      # interfaces (IPostManager, IPostAccessor...),
                                # DTOs, MassTransit event records
  FamilyJournal.Data/           # EF Core DbContext, entities, migrations
tests/
  FamilyJournal.Tests/          # TreeEngine gets the densest coverage
```

Everything is registered via DI against `Contracts` interfaces — managers, engines, and accessors are all swappable and mockable.

---

## Volatility Map (why these boundaries)

| Thing that will change | Hidden behind |
|---|---|
| Tree layout / sibling-inference algorithm | `TreeEngine` |
| Invite → claim workflow (highest product churn) | `FamilyManager` |
| Notification channels (in-app → mobile push) | `NotificationManager` + MassTransit |
| Message transport (in-memory → broker) | MassTransit config only |
| Database schema / ORM | Accessors + `FamilyJournal.Data` |
| Photo storage provider | `MediaAccessor` |
