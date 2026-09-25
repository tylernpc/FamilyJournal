"use client";

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
import { CandleIcon, LinkIcon, MailIcon, TreeIcon } from "./icons";
import { LIFE_EVENTS, LifeEventGlyph } from "./life-event";
import { PostCard } from "./post-card";

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

export function ProfileView({ id }: { id: string }) {
  const { posts } = useStore();
  const person = getPerson(id);
  const isMe = id === CURRENT_USER_ID;
  const theirs = posts.filter((p) => postInvolves(p, id));
  const timeline = timelineFor(person, posts);
  const [tab, setTab] = useState<"timeline" | "posts">("timeline");
  const deceased = person.lifeStatus === "deceased";

  return (
    <div className="mx-auto w-full max-w-[960px] py-6 sm:px-6 sm:py-10">
      <header className="px-4 sm:px-0">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
          <Avatar personId={id} size={96} />
          <div className="min-w-0 flex-1">
            {deceased && (
              <div className="mb-1 flex items-center gap-1.5 text-[13px] text-ink-3">
                <CandleIcon size={15} />
                In memory
              </div>
            )}
            <h1 className="font-serif text-[34px] leading-[1.1] tracking-[-0.01em]">
              {fullName(person)}
            </h1>
            <p className="mt-1.5 text-[14px] text-ink-2">
              {[
                isMe ? "You" : kinship(CURRENT_USER_ID, id),
                person.maidenName ? `née ${person.maidenName}` : null,
                deceased ? lifespan(person) : person.birthDate ? `${age(person)} years old` : null,
                person.location,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/tree?person=${id}`}
              className="flex h-9 items-center gap-2 rounded-md border border-line bg-surface px-3 text-[14px] hover:bg-hover"
            >
              <TreeIcon size={16} className="text-ink-3" />
              In the tree
            </Link>
            {!isMe && (
              <Link
                href={`/?with=${id}`}
                className="flex h-9 items-center rounded-md bg-accent px-3.5 text-[14px] font-medium text-white hover:bg-accent-hover dark:text-[#10180f]"
              >
                {deceased ? "Share a memory" : `Post with ${person.firstName}`}
              </Link>
            )}
          </div>
        </div>
        {person.bio && (
          <p className="mt-5 max-w-[600px] text-[15px] leading-relaxed text-ink">{person.bio}</p>
        )}
        {person.isPlaceholder && <PlaceholderNotice person={person} />}
      </header>

      <div className="mt-8 flex flex-col gap-8 lg:flex-row">
        <div className="min-w-0 flex-1">
          <div className="flex gap-5 border-b border-line px-4 sm:px-0" role="tablist">
            {(
              [
                ["timeline", "Timeline"],
                ["posts", `Posts · ${theirs.length}`],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={`-mb-px border-b-2 pb-2.5 text-[14px] ${
                  tab === key
                    ? "border-ink font-medium text-ink"
                    : "border-transparent text-ink-3 hover:text-ink-2"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "timeline" ? (
            <Timeline entries={timeline} onOpenPosts={() => setTab("posts")} />
          ) : (
            <div className="mt-4 space-y-3">
              {theirs.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
              {theirs.length === 0 && (
                <p className="px-4 py-10 text-center text-[14px] text-ink-3">
                  No posts with {person.firstName} yet.
                </p>
              )}
            </div>
          )}
        </div>

        <aside className="w-full shrink-0 space-y-4 px-4 sm:px-0 lg:w-[300px]">
          <Relatives id={id} />
          <ShowsUpWith id={id} posts={posts} />
        </aside>
      </div>
    </div>
  );
}

function PlaceholderNotice({ person }: { person: Person }) {
  const addedBy = getPerson(person.addedBy ?? CURRENT_USER_ID);
  const child = (age(person) ?? 99) < 13;
  let body: React.ReactNode;

  if (person.lifeStatus === "deceased") {
    body = (
      <>
        {person.firstName}&apos;s page is kept by the family. {addedBy.firstName} added it; anyone
        can tag {person.firstName} in a post to add to the story.
      </>
    );
  } else if (child) {
    body = (
      <>
        {person.firstName}&apos;s profile is looked after by {addedBy.firstName} until{" "}
        {person.sex === "f" ? "she's" : person.sex === "m" ? "he's" : "they're"} old enough to
        claim it.
      </>
    );
  } else {
    body = (
      <>
        {person.firstName} isn&apos;t on Family Journal yet.{" "}
        {person.inviteSentAt
          ? `${addedBy.firstName} sent an invite on ${longDate(person.inviteSentAt)}.`
          : "Invite them to claim this profile."}{" "}
        Posts they&apos;re tagged in will be waiting when they join.
      </>
    );
  }

  const invitable = person.lifeStatus === "living" && !child;

  return (
    <div className="mt-5 flex max-w-[600px] flex-col gap-3 rounded-lg border border-dashed border-line-strong bg-surface px-4 py-3 sm:flex-row sm:items-center">
      <p className="flex-1 text-[14px] leading-relaxed text-ink-2">{body}</p>
      {invitable && (
        <div className="flex shrink-0 gap-2">
          <button className="flex h-8 items-center gap-1.5 rounded-md border border-line px-2.5 text-[13px] hover:bg-hover">
            <LinkIcon size={15} className="text-ink-3" />
            Copy link
          </button>
          <button className="flex h-8 items-center gap-1.5 rounded-md border border-line px-2.5 text-[13px] hover:bg-hover">
            <MailIcon size={15} className="text-ink-3" />
            {person.inviteSentAt ? "Resend" : "Invite"}
          </button>
        </div>
      )}
    </div>
  );
}

function Timeline({ entries, onOpenPosts }: { entries: TimelineEntry[]; onOpenPosts: () => void }) {
  return (
    <ol className="relative mt-6 px-4 sm:px-0">
      <span className="absolute bottom-3 left-[calc(1rem+83px)] top-3 w-px bg-line sm:left-[83px]" aria-hidden="true" />
      {entries.map((e, i) => {
        const year = e.date.slice(0, 4);
        const showYear = i === 0 || entries[i - 1].date.slice(0, 4) !== year;
        const meta = LIFE_EVENTS[e.type];
        return (
          <li key={i} className="relative flex gap-4 pb-6 last:pb-0">
            <span className="w-12 shrink-0 pt-1.5 text-right text-[13px] font-medium tabular-nums text-ink-2">
              {showYear ? year : ""}
            </span>
            <span className="relative z-10 ml-1 shrink-0 rounded-md ring-4 ring-canvas">
              <LifeEventGlyph type={e.type} size={30} />
            </span>
            <div className="min-w-0 pt-0.5">
              <div className="text-[15px] font-medium leading-snug">{e.title}</div>
              <div className="mt-0.5 text-[13px] text-ink-3">
                {longDate(e.date)}
                {e.detail && <> · {e.detail}</>}
                {!e.detail && e.postId && <> · {meta.label}</>}
              </div>
              {e.postId && (
                <button
                  onClick={onOpenPosts}
                  className="mt-1 text-[13px] font-medium text-accent-ink hover:underline"
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

function Relatives({ id }: { id: string }) {
  const groups: [string, string[]][] = [
    ["Parents", parentsOf(id)],
    ["Spouse", spouseOf(id) ? [spouseOf(id)!] : []],
    ["Siblings", siblingsOf(id)],
    ["Children", childrenOf(id)],
  ];
  const visible = groups.filter(([, ids]) => ids.length);

  return (
    <section className="rounded-lg border border-line bg-surface">
      <h2 className="border-b border-line px-4 py-3 text-[13px] font-semibold text-ink-2">
        Immediate family
      </h2>
      <div className="divide-y divide-line">
        {visible.map(([label, ids]) => (
          <div key={label} className="px-4 py-3">
            <div className="text-[12px] text-ink-3">{label}</div>
            <ul className="mt-2 space-y-2">
              {ids.map((rid) => (
                <li key={rid}>
                  <Link href={`/people/${rid}`} className="group flex items-center gap-2.5">
                    <Avatar personId={rid} size={28} />
                    <span className="text-[14px] group-hover:underline">
                      {fullName(getPerson(rid))}
                    </span>
                    {getPerson(rid).lifeStatus === "deceased" && (
                      <span className="text-[12px] text-ink-3">{lifespan(getPerson(rid))}</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {visible.length === 0 && (
          <p className="px-4 py-3 text-[13px] text-ink-3">No relationships added yet.</p>
        )}
      </div>
    </section>
  );
}

function ShowsUpWith({ id, posts }: { id: string; posts: Post[] }) {
  const list = companions(posts, id).slice(0, 5);
  if (!list.length) return null;
  const person = getPerson(id);
  return (
    <section className="rounded-lg border border-line bg-surface p-4">
      <h2 className="text-[13px] font-semibold text-ink-2">
        Often in posts with {id === CURRENT_USER_ID ? "you" : person.firstName}
      </h2>
      <ul className="mt-3 space-y-2.5">
        {list.map(({ id: other, count }) => (
          <li key={other}>
            <Link href={`/people/${other}`} className="group flex items-center gap-2.5">
              <Avatar personId={other} size={28} />
              <span className="flex-1 text-[14px] group-hover:underline">
                {fullName(getPerson(other))}
              </span>
              <span className="text-[12px] tabular-nums text-ink-3">{count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
