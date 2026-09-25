"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { CURRENT_USER_ID, relationships } from "@/lib/data";
import {
  age,
  childrenOf,
  companions,
  fullName,
  getPerson,
  kinship,
  lifespan,
  longDate,
  parentsOf,
  postInvolves,
  siblingsOf,
  spouseOf,
} from "@/lib/family";
import { useStore } from "@/lib/store";
import type { LifeEventType, Person, Post } from "@/lib/types";
import { Avatar } from "./avatar";
import { CakeIcon, MailIcon, PeopleIcon, PinIcon } from "./icons";
import { LIFE_EVENTS } from "./life-event";
import { PortraitCard } from "./portrait-card";
import { PostCard } from "./post-card";
import { Sheet } from "./sheet";

type TimelineEntry = {
  date: string;
  type: LifeEventType;
  title: string;
  detail?: string;
  postId?: string;
};

// Profile facts (birth, marriage, children) plus life-event posts, oldest first.
function timelineFor(person: Person, posts: Post[]): TimelineEntry[] {
  const entries: TimelineEntry[] = [];
  const first = person.firstName;

  if (person.birthDate) {
    const parents = parentsOf(person.id).map((id) => getPerson(id).firstName);
    entries.push({
      date: person.birthDate,
      type: "birth",
      title: `${first} was born`,
      detail: parents.length ? `To ${parents.join(" and ")}` : undefined,
    });
  }

  const spouse = spouseOf(person.id);
  const marriage = relationships.find(
    (r) => r.type === "spouseOf" && (r.from === person.id || r.to === person.id),
  );
  if (spouse && marriage?.since) {
    entries.push({
      date: marriage.since,
      type: "marriage",
      title: `Married ${fullName(getPerson(spouse))}`,
    });
  }

  for (const child of childrenOf(person.id)) {
    const c = getPerson(child);
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
    if (ev.type === "memorial") continue;
    if (ev.type === "birth" && childrenOf(person.id).length) continue;
    entries.push({ date: ev.date, type: ev.type, title: ev.title, postId: post.id });
  }

  if (person.deathDate) {
    entries.push({
      date: person.deathDate,
      type: "memorial",
      title: `${first} passed away`,
      detail: `Age ${age(person)}`,
    });
  }

  return entries.sort((a, b) => a.date.localeCompare(b.date));
}

type Tab = "moments" | "timeline" | "family";

export function ProfileView({ id }: { id: string }) {
  const { posts, openComposer } = useStore();
  const person = getPerson(id);
  const isMe = id === CURRENT_USER_ID;
  const deceased = person.lifeStatus === "deceased";
  const theirs = posts.filter((p) => postInvolves(p, id));
  const [tab, setTab] = useState<Tab>("moments");
  const [openPost, setOpenPost] = useState<string | null>(null);
  const child = (age(person) ?? 99) < 13;
  const invitable = person.isPlaceholder && !deceased && !child;
  const post = posts.find((p) => p.id === openPost);

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
            <h1 className="display text-[40px] [text-wrap:balance] sm:text-[48px]">
              {fullName(person)}
            </h1>
            {person.maidenName && (
              <p className="mt-2 text-[15px] text-ink-3">née {person.maidenName}</p>
            )}
          </div>
          <Avatar personId={id} size={88} />
        </div>

        <ul className="mt-5 space-y-2 text-[15px]">
          <Meta icon={PeopleIcon}>
            {isMe ? "You · family admin" : `Your ${kinship(CURRENT_USER_ID, id).toLowerCase()}`}
          </Meta>
          {person.birthDate && (
            <Meta icon={CakeIcon}>
              {deceased
                ? `${lifespan(person)} · lived to ${age(person)}`
                : `Born ${longDate(person.birthDate)}${child ? "" : ` · ${age(person)}`}`}
            </Meta>
          )}
          {person.location && <Meta icon={PinIcon}>{person.location}</Meta>}
          {person.isPlaceholder && (
            <Meta icon={MailIcon}>
              {deceased
                ? `Kept by the family · added by ${getPerson(person.addedBy ?? CURRENT_USER_ID).firstName}`
                : child
                  ? `Looked after by ${getPerson(person.addedBy ?? CURRENT_USER_ID).firstName}`
                  : person.inviteSentAt
                    ? `Invited ${longDate(person.inviteSentAt).replace(/, \d{4}$/, "")} · hasn't joined yet`
                    : "Not on Family Journal yet"}
            </Meta>
          )}
        </ul>

        {person.bio && <p className="mt-4 text-[15px] leading-relaxed">{person.bio}</p>}

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
          <Pill href={`/tree?person=${id}`}>View in tree</Pill>
          {invitable && <Pill onClick={() => {}}>{person.inviteSentAt ? "Resend invite" : "Invite"}</Pill>}
        </div>
      </header>

      <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-10 mt-8 flex border-b border-line bg-canvas px-4 lg:top-16" role="tablist">
        {(
          [
            ["moments", `Moments ${theirs.length}`],
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

      {tab === "moments" && <Moments posts={theirs} onOpen={setOpenPost} name={person.firstName} />}
      {tab === "timeline" && (
        <Timeline entries={timelineFor(person, posts)} onOpen={setOpenPost} />
      )}
      {tab === "family" && <Family id={id} posts={posts} />}

      {post && (
        <Sheet label="Post" onClose={() => setOpenPost(null)} wide>
          <div className="overflow-y-auto">
            <PostCard post={post} />
          </div>
        </Sheet>
      )}
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
  if (!posts.length)
    return <p className="px-4 py-16 text-center text-[15px] text-ink-3">Nothing with {name} yet.</p>;

  return (
    <div className="grid grid-cols-3 gap-0.5 pt-0.5">
      {posts.map((post) => {
        const photo = post.photos?.[0];
        return (
          <button
            key={post.id}
            onClick={() => onOpen(post.id)}
            className="relative aspect-square overflow-hidden bg-sunken text-left"
          >
            {photo ? (
              <Image
                src={photo.src.startsWith("blob:") ? photo.src : `${photo.src.split("?")[0]}?w=480&h=480&fit=crop&q=70`}
                unoptimized={photo.src.startsWith("blob:")}
                alt={photo.alt}
                width={240}
                height={240}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex h-full flex-col justify-end p-3">
                {post.lifeEvent && (
                  <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-3">
                    {LIFE_EVENTS[post.lifeEvent.type].label}
                  </span>
                )}
                <span className="display line-clamp-4 text-[17px] sm:text-[20px]">
                  {post.lifeEvent?.title ?? post.text}
                </span>
              </span>
            )}
            {(post.photos?.length ?? 0) > 1 && (
              <span className="absolute right-2 top-2 rounded-full bg-black/55 px-1.5 text-[11px] font-medium text-white">
                {post.photos!.length}
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
  return (
    <ol className="px-4 pt-4">
      {entries.map((e, i) => {
        const year = e.date.slice(0, 4);
        const showYear = i === 0 || entries[i - 1].date.slice(0, 4) !== year;
        return (
          <li key={i} className={`flex gap-5 ${showYear && i > 0 ? "mt-2 border-t border-line pt-4" : ""} pb-4`}>
            <span className="display w-16 shrink-0 pt-0.5 text-[24px] tabular-nums">
              {showYear ? year : ""}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
                {LIFE_EVENTS[e.type].label}
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

function Family({ id, posts }: { id: string; posts: Post[] }) {
  const spouse = spouseOf(id);
  const groups: [string, string[]][] = [
    ["Parents", parentsOf(id)],
    ["Partner", spouse ? [spouse] : []],
    ["Siblings", siblingsOf(id)],
    ["Children", childrenOf(id)],
  ];
  const together = companions(posts, id).slice(0, 6);

  return (
    <div className="space-y-8 px-4 pt-5">
      {groups
        .filter(([, ids]) => ids.length)
        .map(([label, ids]) => (
          <section key={label}>
            <h2 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-3">{label}</h2>
            <div className="mt-3 grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4">
              {ids.map((rid) => (
                <PortraitCard
                  key={rid}
                  personId={rid}
                  width={150}
                  caption={getPerson(rid).lifeStatus === "deceased" ? lifespan(getPerson(rid)) : kinship(CURRENT_USER_ID, rid)}
                />
              ))}
            </div>
          </section>
        ))}

      {together.length > 0 && (
        <section>
          <h2 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-3">
            Most often in posts with
          </h2>
          <div className="no-scrollbar -mx-4 mt-3 flex gap-4 overflow-x-auto px-4">
            {together.map(({ id: other, count }) => (
              <Link key={other} href={`/people/${other}`} className="w-16 shrink-0 text-center">
                <Avatar personId={other} size={64} />
                <span className="mt-1.5 block truncate text-[13px] font-medium">
                  {getPerson(other).firstName}
                </span>
                <span className="block text-[12px] text-ink-3">{count}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
