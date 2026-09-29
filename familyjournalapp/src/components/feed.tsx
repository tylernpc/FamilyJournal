"use client";

import Image from "next/image";
import Link from "next/link";
import { NOW, people } from "@/lib/data";
import { getPerson, isRecent, peopleInPost, photoUrl, postInvolves } from "@/lib/family";
import { useStore } from "@/lib/store";
import type { Post } from "@/lib/types";
import { CloseIcon, PlusIcon } from "./icons";
import { PostCard } from "./post-card";

const dayFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

function weekOf(date: Date) {
  // ISO week number, Monday-based.
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);

  const monday = new Date(date);
  monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { week, range: `${dayFormat.format(monday)} – ${dayFormat.format(sunday)}` };
}

export function Feed({ personFilter }: { personFilter?: string }) {
  const { posts } = useStore();
  const visible = posts.filter((p) => !personFilter || postInvolves(p, personFilter));
  const { week, range } = weekOf(NOW);
  const thisWeek = posts.filter((p) => isRecent(p.createdAt));

  return (
    <div className="mx-auto w-full max-w-[600px] pb-10">
      <div className="px-4 pb-1 pt-6 lg:pt-10">
        <h1 className="display text-[40px]">Week {week}</h1>
        <p className="mt-1.5 text-[14px] text-ink-3">
          {range} · {thisWeek.length} {thisWeek.length === 1 ? "post" : "posts"} from the family
        </p>
      </div>

      <WeekStrip posts={posts} selected={personFilter} />

      {personFilter && (
        <div className="flex items-center justify-between border-b border-line px-4 pb-3 pt-1 text-[14px]">
          <span className="text-ink-2">
            Posts with <span className="font-semibold text-ink">{getPerson(personFilter).firstName}</span>
          </span>
          <Link
            href="/"
            scroll={false}
            className="flex items-center gap-1 rounded-full bg-sunken py-1 pl-2.5 pr-2 text-[13px] font-medium"
          >
            Everyone
            <CloseIcon size={14} />
          </Link>
        </div>
      )}

      <div className="divide-y divide-line">
        {visible.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="px-4 py-16 text-center text-[15px] text-ink-3">
          No posts with {personFilter && getPerson(personFilter).firstName} yet.
        </p>
      ) : (
        <p className="border-t border-line px-4 pt-8 text-center text-[13px] text-ink-3">
          That&apos;s everything. The Harlows started this journal in November 2025.
        </p>
      )}
    </div>
  );
}

// Who's been in the journal this week, most recent first.
function WeekStrip({ posts, selected }: { posts: Post[]; selected?: string }) {
  const { openComposer } = useStore();
  const latest = new Map<string, Post>();
  for (const post of posts) {
    if (!isRecent(post.createdAt)) continue;
    for (const id of peopleInPost(post)) if (!latest.has(id)) latest.set(id, post);
  }
  const ids = [...latest.keys()].filter((id) => people.some((p) => p.id === id));

  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-4">
      <button
        onClick={() => openComposer()}
        className="flex h-[132px] w-[96px] shrink-0 flex-col items-center justify-center gap-1.5 rounded-xl bg-sunken text-[13px] font-medium text-ink-2 hover:bg-hover"
      >
        <PlusIcon size={26} />
        Share
      </button>
      {ids.map((id) => {
        const person = getPerson(id);
        const src = photoUrl(person, 96, 132);
        const active = selected === id;
        return (
          <Link
            key={id}
            href={active ? "/" : `/?person=${id}`}
            scroll={false}
            aria-pressed={active}
            className={`relative h-[132px] w-[96px] shrink-0 overflow-hidden rounded-xl bg-sunken ${
              active ? "ring-2 ring-ink ring-offset-2 ring-offset-canvas" : ""
            } ${selected && !active ? "opacity-50" : ""}`}
          >
            {src && (
              <Image src={src} alt="" width={96} height={132} className="h-full w-full object-cover" />
            )}
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2 pb-1.5 pt-6 text-[13px] font-semibold text-white">
              {person.firstName}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
