"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { loadPosts } from "@/app/f/[familyId]/actions";
import { useComposer } from "@/lib/composer";
import { isRecent, localDate, peopleInPost } from "@/lib/family";
import { useClock, useFamily } from "@/lib/family-context";
import { frame } from "@/lib/photo";
import type { FeedPage, Post } from "@/lib/types";
import { useServerState } from "@/lib/use-server-state";
import { CloseIcon, PlusIcon } from "./icons";
import { PostCard } from "./post-card";

const dayFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

// ISO week number and its Monday–Sunday range, for a calendar date like "2026-09-24".
function weekOf(isoDate: string) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  const d = new Date(date);
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);

  const monday = new Date(date);
  monday.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return { week, range: `${dayFormat.format(monday)} – ${dayFormat.format(sunday)}` };
}

export function Feed({ initial, personFilter }: { initial: FeedPage; personFilter?: string }) {
  const { family, graph, href } = useFamily();
  const { now, timeZone } = useClock();
  // Older pages loaded by scrolling. A refresh from the server replaces the first page only.
  const [older, setOlder] = useState<Post[]>([]);
  const [cursor, setCursor] = useServerState(initial.nextBefore);
  const [error, setError] = useState<string>();
  const [loading, startLoading] = useTransition();
  const sentinel = useRef<HTMLDivElement>(null);

  const firstIds = new Set(initial.posts.map((p) => p.id));
  const posts = [...initial.posts, ...older.filter((p) => !firstIds.has(p.id))];
  const thisWeek = initial.posts.filter((p) => isRecent(p.createdAt, now));
  const { week, range } = weekOf(localDate(now, timeZone));
  const filtered = graph.findPerson(personFilter);

  const loadMore = () => {
    if (!cursor || loading) return;
    startLoading(async () => {
      const result = await loadPosts(family.id, personFilter ?? null, cursor);
      if (!result.ok) return setError(result.error);
      setError(undefined);
      setOlder((all) => [...all, ...result.data.posts]);
      setCursor(result.data.nextBefore);
    });
  };

  // Loads the next page as the end of the list scrolls into view.
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !cursor) return;
    const observer = new IntersectionObserver((entries) => entries[0].isIntersecting && loadMore(), {
      rootMargin: "800px",
    });
    observer.observe(el);
    return () => observer.disconnect();
  });

  return (
    <div className="mx-auto w-full max-w-[600px] pb-10">
      <div className="px-4 pb-1 pt-6 lg:pt-10">
        <h1 className="display text-[40px]">Week {week}</h1>
        <p className="mt-1.5 text-[14px] text-ink-3">
          {range} · {thisWeek.length} {thisWeek.length === 1 ? "post" : "posts"} from the family
        </p>
      </div>

      <WeekStrip posts={thisWeek} selected={personFilter} />

      {filtered && (
        <div className="flex items-center justify-between border-b border-line px-4 pb-3 pt-1 text-[14px]">
          <span className="text-ink-2">
            Posts with <span className="font-semibold text-ink">{filtered.firstName}</span>
          </span>
          <Link
            href={href()}
            scroll={false}
            className="flex items-center gap-1 rounded-full bg-sunken py-1 pl-2.5 pr-2 text-[13px] font-medium"
          >
            Everyone
            <CloseIcon size={14} />
          </Link>
        </div>
      )}

      <div className="divide-y divide-line">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>

      <div ref={sentinel} />
      {posts.length === 0 ? (
        <EmptyFeed name={filtered?.firstName} />
      ) : cursor ? (
        <div className="px-4 py-8 text-center text-[13px] text-ink-3">
          {error ? (
            <button onClick={loadMore} className="font-semibold text-ink">
              {error} Try again
            </button>
          ) : (
            "Loading older posts…"
          )}
        </div>
      ) : (
        <p className="border-t border-line px-4 pt-8 text-center text-[13px] text-ink-3">That&apos;s everything so far.</p>
      )}
    </div>
  );
}

function EmptyFeed({ name }: { name?: string }) {
  const { openComposer } = useComposer();
  return (
    <div className="px-4 py-16 text-center">
      <p className="display text-[26px]">{name ? `Nothing with ${name} yet` : "Nothing here yet"}</p>
      <p className="mx-auto mt-2 max-w-[340px] text-[15px] text-ink-2">
        Share a photo, a bit of news or a life event, and tag whoever&apos;s in it.
      </p>
      <button
        onClick={() => openComposer()}
        className="mt-5 h-10 rounded-full bg-ink px-5 text-[14px] font-semibold text-canvas hover:bg-accent-hover"
      >
        Share the first update
      </button>
    </div>
  );
}

// Who's been in the journal this week, most recent first.
function WeekStrip({ posts, selected }: { posts: Post[]; selected?: string }) {
  const { graph, href } = useFamily();
  const { openComposer } = useComposer();
  const latest = new Map<string, Post>();
  for (const post of posts) {
    for (const id of peopleInPost(post)) if (!latest.has(id)) latest.set(id, post);
  }
  const ids = [...latest.keys()].filter((id) => graph.findPerson(id));

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
        const person = graph.getPerson(id);
        const active = selected === id;
        return (
          <Link
            key={id}
            href={active ? href() : href(`?person=${id}`)}
            scroll={false}
            aria-pressed={active}
            className={`relative h-[132px] w-[96px] shrink-0 overflow-hidden rounded-xl bg-sunken ${
              active ? "ring-2 ring-ink ring-offset-2 ring-offset-canvas" : ""
            } ${selected && !active ? "opacity-50" : ""}`}
          >
            {person.photo ? (
              <Image src={frame(person.photo, "portrait").src} alt="" width={96} height={132} className="h-full w-full object-cover" />
            ) : (
              <span className="display flex h-full items-center justify-center pb-5 text-[36px] text-ink-3">
                {person.firstName[0]}
              </span>
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
