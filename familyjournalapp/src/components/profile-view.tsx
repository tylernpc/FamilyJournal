"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useComposer } from "@/lib/composer";
import { age, companions, fullName, lifespan, longDate, type FamilyGraph } from "@/lib/family";
import { useClock, useFamily } from "@/lib/family-context";
import { lifeEventLabel } from "@/lib/life-events";
import { frame } from "@/lib/photo";
import type { LifeEventType, Person, Post } from "@/lib/types";
import { Avatar } from "./avatar";
import { CakeIcon, GearIcon, MailIcon, PeopleIcon, PinIcon, PlusIcon } from "./icons";
import { AddRelativeSheet, InviteSheet, PersonSheet } from "./person-sheets";
import { PortraitCard } from "./portrait-card";
import { PostCard } from "./post-card";
import { Sheet } from "./sheet";

type TimelineEntry = {
  date: string;
  type: LifeEventType;
  label?: string;
  title: string;
  detail?: string;
  postId?: string;
};

// Profile facts (birth, marriage, children) plus life-event posts, oldest first.
function timelineFor(person: Person, posts: Post[], graph: FamilyGraph, now: number): TimelineEntry[] {
  const entries: TimelineEntry[] = [];
  const first = person.firstName;
  const children = graph.childrenOf(person.id);

  if (person.birthDate) {
    const parents = graph.parentsOf(person.id).map((id) => graph.getPerson(id).firstName);
    entries.push({
      date: person.birthDate,
      type: "birth",
      title: `${first} was born`,
      detail: parents.length ? `To ${parents.join(" and ")}` : undefined,
    });
  }

  const spouse = graph.spouseOf(person.id);
  const marriage = graph.marriageOf(person.id);
  if (spouse && marriage?.since) {
    entries.push({
      date: marriage.since,
      type: "marriage",
      title: `Married ${fullName(graph.getPerson(spouse))}`,
    });
  }

  for (const child of children) {
    const c = graph.getPerson(child);
    if (c.birthDate)
      entries.push({
        date: c.birthDate,
        type: "birth",
        title: `${c.firstName} was born`,
        detail: c.sex === "f" ? "Daughter" : c.sex === "m" ? "Son" : "Child",
      });
  }

  for (const post of posts) {
    if (!post.lifeEvent || !post.tagged.includes(person.id)) continue;
    const ev = post.lifeEvent;
    // Births and memorials are already covered by profile facts.
    if (ev.type === "birth" && ev.date === person.birthDate) continue;
    if (ev.type === "memorial" || ev.type === "passing") continue;
    if (ev.type === "birth" && children.length) continue;
    entries.push({ date: ev.date, type: ev.type, label: ev.label, title: ev.title, postId: post.id });
  }

  if (person.deathDate) {
    const lived = age(person, now);
    entries.push({
      date: person.deathDate,
      type: "memorial",
      title: `${first} passed away`,
      detail: lived !== undefined ? `Age ${lived}` : undefined,
    });
  }

  return entries.sort((a, b) => a.date.localeCompare(b.date));
}

type Tab = "moments" | "timeline" | "family";
type Open = "edit" | "invite" | "relative" | null;

export function ProfileView({ id, posts }: { id: string; posts: Post[] }) {
  const { me, graph, isAdmin, href } = useFamily();
  const { now } = useClock();
  const { openComposer } = useComposer();
  const person = graph.getPerson(id);
  const isMe = id === me;
  const deceased = person.lifeStatus === "deceased";
  const [tab, setTab] = useState<Tab>("moments");
  const [openPost, setOpenPost] = useState<string | null>(null);
  const [open, setOpen] = useState<Open>(null);
  const years = age(person, now);
  const child = (years ?? 99) < 13;
  const invitable = person.isPlaceholder && !deceased && !child;
  const post = posts.find((p) => p.id === openPost);
  const keeper = graph.findPerson(person.addedBy)?.firstName ?? "the family";

  return (
    <div className="mx-auto w-full max-w-[680px] pb-12">
      <header className="px-4 pt-6 lg:pt-10">
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1 pt-1">
            {deceased && (
              <div className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-3">
                In memory
              </div>
            )}
            <h1 className="display text-[40px] [text-wrap:balance] sm:text-[48px]">{fullName(person)}</h1>
            {person.maidenName && <p className="mt-2 text-[15px] text-ink-3">née {person.maidenName}</p>}
          </div>
          <Avatar personId={id} size={88} />
        </div>

        <ul className="mt-5 space-y-2 text-[15px]">
          <Meta icon={PeopleIcon}>
            {isMe
              ? isAdmin
                ? "You · family admin"
                : "You"
              : `Your ${graph.kinship(me, id).toLowerCase()}${person.role === "admin" ? " · family admin" : ""}`}
          </Meta>
          {person.birthDate && (
            <Meta icon={CakeIcon}>
              {deceased
                ? `${lifespan(person)}${years !== undefined ? ` · lived to ${years}` : ""}`
                : `Born ${longDate(person.birthDate)}${child || years === undefined ? "" : ` · ${years}`}`}
            </Meta>
          )}
          {person.location && <Meta icon={PinIcon}>{person.location}</Meta>}
          {person.isPlaceholder && (
            <Meta icon={MailIcon}>
              {deceased
                ? `Kept by the family · added by ${keeper}`
                : child
                  ? `Looked after by ${keeper}`
                  : person.inviteSentAt
                    ? `Invited ${longDate(person.inviteSentAt).replace(/, \d{4}$/, "")} · hasn't joined yet`
                    : "Not on Family Journal yet"}
            </Meta>
          )}
        </ul>

        {person.bio && <p className="mt-4 whitespace-pre-line text-[15px] leading-relaxed">{person.bio}</p>}

        <div className="mt-5 flex flex-wrap gap-2">
          {isMe ? (
            <Pill onClick={() => openComposer()} primary>
              New post
            </Pill>
          ) : (
            <Pill onClick={() => openComposer([id])} primary>
              {deceased ? "Share a memory" : `Post with ${person.firstName}`}
            </Pill>
          )}
          {person.canEdit && <Pill onClick={() => setOpen("edit")}>{isMe ? "Edit profile" : "Edit"}</Pill>}
          {!isMe && <Pill href={href(`/tree?person=${id}`)}>View in tree</Pill>}
          {invitable && (
            <Pill onClick={() => setOpen("invite")}>{person.inviteSentAt ? "Invite again" : "Invite"}</Pill>
          )}
          {isMe && (
            <Link
              href={href("/settings")}
              aria-label="Settings"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-ink hover:bg-hover"
            >
              <GearIcon size={19} />
            </Link>
          )}
        </div>
      </header>

      <div
        className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-10 mt-8 flex border-b border-line bg-canvas px-4 lg:top-16"
        role="tablist"
      >
        {(
          [
            ["moments", `Moments ${posts.length}`],
            ["timeline", "Timeline"],
            ["family", "Family"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`-mb-px mr-6 border-b-2 py-3 text-[15px] ${
              tab === key ? "border-ink font-semibold text-ink" : "border-transparent text-ink-3"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "moments" && <Moments posts={posts} onOpen={setOpenPost} name={person.firstName} />}
      {tab === "timeline" && <Timeline entries={timelineFor(person, posts, graph, now)} onOpen={setOpenPost} />}
      {tab === "family" && <Family id={id} posts={posts} onAdd={() => setOpen("relative")} />}

      {post && (
        <Sheet label="Post" onClose={() => setOpenPost(null)} wide>
          <div className="overflow-y-auto">
            <PostCard post={post} />
          </div>
        </Sheet>
      )}
      {open === "edit" && <PersonSheet person={person} onClose={() => setOpen(null)} />}
      {open === "invite" && <InviteSheet profileId={id} onClose={() => setOpen(null)} />}
      {open === "relative" && <AddRelativeSheet personId={id} onClose={() => setOpen(null)} />}
    </div>
  );
}

function Meta({ icon: Icon, children }: { icon: typeof PinIcon; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2.5 text-ink-2">
      <Icon size={18} className="shrink-0" />
      <span>{children}</span>
    </li>
  );
}

function Pill({
  children,
  href,
  onClick,
  primary = false,
}: {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  primary?: boolean;
}) {
  const cls = `flex h-10 items-center rounded-full px-5 text-[14px] font-semibold ${
    primary ? "bg-ink text-canvas hover:bg-accent-hover" : "border border-ink hover:bg-hover"
  }`;
  return href ? (
    <Link href={href} className={cls}>
      {children}
    </Link>
  ) : (
    <button onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

// Grid of everything they're in. Text-only posts become typographic tiles.
function Moments({
  posts,
  onOpen,
  name,
}: {
  posts: Post[];
  onOpen: (id: string) => void;
  name: string;
}) {
  const { graph } = useFamily();
  if (!posts.length)
    return <p className="px-4 py-16 text-center text-[15px] text-ink-3">Nothing with {name} yet.</p>;

  return (
    <div className="grid grid-cols-3 gap-0.5 pt-0.5">
      {posts.map((post) => {
        const photo = post.photos[0] ? frame(post.photos[0], "post") : graph.eventCover(post);
        return (
          <button
            key={post.id}
            onClick={() => onOpen(post.id)}
            className="relative aspect-square overflow-hidden bg-sunken text-left"
          >
            {photo ? (
              <Image
                src={photo.src}
                alt={photo.alt}
                width={240}
                height={240}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex h-full flex-col justify-end p-3">
                {post.lifeEvent && (
                  <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-3">
                    {lifeEventLabel(post.lifeEvent)}
                  </span>
                )}
                <span className="display line-clamp-4 text-[17px] sm:text-[20px]">
                  {post.lifeEvent?.title ?? post.text}
                </span>
              </span>
            )}
            {post.photos.length > 1 && (
              <span className="absolute right-2 top-2 rounded-full bg-black/55 px-1.5 text-[11px] font-medium text-white">
                {post.photos.length}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function Timeline({
  entries,
  onOpen,
}: {
  entries: TimelineEntry[];
  onOpen: (id: string) => void;
}) {
  if (!entries.length)
    return (
      <p className="px-4 py-16 text-center text-[15px] text-ink-3">
        Add a birthday or share a life event to start the timeline.
      </p>
    );

  return (
    <ol className="px-4 pt-4">
      {entries.map((e, i) => {
        const year = e.date.slice(0, 4);
        const showYear = i === 0 || entries[i - 1].date.slice(0, 4) !== year;
        return (
          <li key={i} className={`flex gap-5 ${showYear && i > 0 ? "mt-2 border-t border-line pt-4" : ""} pb-4`}>
            <span className="display w-16 shrink-0 pt-0.5 text-[24px] tabular-nums">{showYear ? year : ""}</span>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
                {lifeEventLabel(e)}
              </div>
              <div className="mt-0.5 text-[16px] font-semibold leading-snug">{e.title}</div>
              <div className="mt-0.5 text-[14px] text-ink-3">
                {longDate(e.date)}
                {e.detail && <> · {e.detail}</>}
              </div>
              {e.postId && (
                <button
                  onClick={() => onOpen(e.postId!)}
                  className="mt-1.5 text-[14px] font-semibold underline decoration-line-strong underline-offset-4 hover:decoration-ink"
                >
                  See the post
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function Family({ id, posts, onAdd }: { id: string; posts: Post[]; onAdd: () => void }) {
  const { me, graph, href } = useFamily();
  const spouse = graph.spouseOf(id);
  const groups: [string, string[]][] = [
    ["Parents", graph.parentsOf(id)],
    ["Partner", spouse ? [spouse] : []],
    ["Siblings", graph.siblingsOf(id)],
    ["Children", graph.childrenOf(id)],
  ];
  const together = companions(posts, id).slice(0, 6);
  const caption = (rid: string) => {
    const relative = graph.getPerson(rid);
    return relative.lifeStatus === "deceased" ? lifespan(relative) : rid === me ? "You" : graph.kinship(me, rid);
  };

  return (
    <div className="space-y-8 px-4 pt-5">
      {groups
        .filter(([, ids]) => ids.length)
        .map(([label, ids]) => (
          <section key={label}>
            <h2 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-3">{label}</h2>
            <div className="mt-3 grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4">
              {ids.map((rid) => (
                <PortraitCard key={rid} personId={rid} width={150} caption={caption(rid)} />
              ))}
            </div>
          </section>
        ))}

      <button
        onClick={onAdd}
        className="flex h-11 items-center gap-2 rounded-full border border-ink px-4 text-[14px] font-semibold hover:bg-hover"
      >
        <PlusIcon size={18} strokeWidth={2} />
        Add a parent, partner or child
      </button>

      {together.length > 0 && (
        <section>
          <h2 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-3">Most often in posts with</h2>
          <div className="no-scrollbar -mx-4 mt-3 flex gap-4 overflow-x-auto px-4">
            {together.map(({ id: other, count }) => (
              <Link key={other} href={href(`/people/${other}`)} className="w-16 shrink-0 text-center">
                <Avatar personId={other} size={64} />
                <span className="mt-1.5 block truncate text-[13px] font-medium">{graph.getPerson(other).firstName}</span>
                <span className="block text-[12px] text-ink-3">{count}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
