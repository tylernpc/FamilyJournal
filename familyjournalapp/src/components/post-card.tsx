"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { CURRENT_USER_ID } from "@/lib/data";
import { fullName, getPerson, kinship, lifespan, longDate, relativeTime } from "@/lib/family";
import { useStore } from "@/lib/store";
import type { Post } from "@/lib/types";
import { Avatar } from "./avatar";
import { LIFE_EVENTS, LifeEventGlyph } from "./life-event";
import { MentionInput } from "./mention-input";
import { MentionText } from "./mention-text";
import { PostActions, ReactionSummary } from "./reactions";

function PersonName({ id }: { id: string }) {
  return (
    <Link href={`/people/${id}`} className="font-semibold text-ink hover:underline">
      {fullName(getPerson(id))}
    </Link>
  );
}

function TaggedLine({ post }: { post: Post }) {
  const tagged = post.tagged.filter((id) => id !== post.authorId);
  if (!tagged.length) return <PersonName id={post.authorId} />;
  const [first, ...rest] = tagged;
  return (
    <span>
      <PersonName id={post.authorId} />
      <span className="text-ink-2"> with </span>
      <PersonName id={first} />
      {rest.length === 1 && (
        <>
          <span className="text-ink-2"> and </span>
          <PersonName id={rest[0]} />
        </>
      )}
      {rest.length > 1 && (
        <span className="text-ink-2">
          {" "}
          and{" "}
          <span
            className="font-semibold text-ink"
            title={rest.map((id) => fullName(getPerson(id))).join(", ")}
          >
            {rest.length} others
          </span>
        </span>
      )}
    </span>
  );
}

export function PostCard({ post }: { post: Post }) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [showAll, setShowAll] = useState(false);
  const [draft, setDraft] = useState("");
  const { addComment } = useStore();

  const relation =
    post.authorId === CURRENT_USER_ID ? null : kinship(CURRENT_USER_ID, post.authorId);
  const hidden = showAll ? 0 : Math.max(0, post.comments.length - 2);
  const comments = post.comments.slice(hidden);

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    addComment(post.id, text);
    setDraft("");
    setShowAll(true);
  };

  return (
    <article className="border-y border-line bg-surface sm:rounded-lg sm:border-x">
      <header className="flex gap-3 px-4 pt-4">
        <Link href={`/people/${post.authorId}`} className="shrink-0">
          <Avatar personId={post.authorId} size={40} />
        </Link>
        <div className="min-w-0 pt-px text-[15px] leading-snug">
          <TaggedLine post={post} />
          <div className="mt-0.5 text-[13px] text-ink-3">
            {relation && <>{relation} · </>}
            <time dateTime={post.createdAt}>{relativeTime(post.createdAt)}</time>
          </div>
        </div>
      </header>

      {post.lifeEvent && <LifeEventBanner post={post} />}

      <p className="whitespace-pre-line px-4 pt-3 text-[15px] leading-relaxed text-ink">
        {post.text}
      </p>

      {post.photos && post.photos.length > 0 && (
        <div
          className={`mt-3 grid gap-0.5 overflow-hidden ${
            post.photos.length > 1 ? "grid-cols-2" : ""
          }`}
        >
          {post.photos.map((photo) => (
            <Image
              key={photo.src}
              src={photo.src}
              alt={photo.alt}
              width={photo.width}
              height={photo.height}
              sizes="(min-width: 640px) 600px, 100vw"
              className={`w-full bg-sunken object-cover ${
                post.photos!.length > 1 ? "aspect-square" : "max-h-[520px]"
              }`}
            />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between px-4 pt-3 text-[13px] text-ink-3">
        <ReactionSummary post={post} />
        {post.comments.length > 0 && (
          <button onClick={() => setShowAll(true)} className="hover:text-ink-2 hover:underline">
            {post.comments.length} comment{post.comments.length > 1 ? "s" : ""}
          </button>
        )}
      </div>

      <div className="mx-4 mt-2 border-t border-line py-1">
        <PostActions post={post} onComment={() => inputRef.current?.focus()} />
      </div>

      {(comments.length > 0 || hidden > 0) && (
        <div className="space-y-3 px-4 pb-1 pt-2">
          {hidden > 0 && (
            <button
              onClick={() => setShowAll(true)}
              className="text-[13px] font-medium text-ink-2 hover:underline"
            >
              View {hidden} earlier comment{hidden > 1 ? "s" : ""}
            </button>
          )}
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2.5">
              <Link href={`/people/${c.authorId}`} className="shrink-0 pt-0.5">
                <Avatar personId={c.authorId} size={30} />
              </Link>
              <div className="min-w-0">
                <div className="rounded-lg bg-sunken px-3 py-2 text-[14px] leading-snug">
                  <Link
                    href={`/people/${c.authorId}`}
                    className="mr-1.5 font-semibold hover:underline"
                  >
                    {fullName(getPerson(c.authorId))}
                  </Link>
                  <MentionText text={c.text} />
                </div>
                <div className="mt-1 pl-3 text-[12px] text-ink-3">{relativeTime(c.createdAt)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-start gap-2.5 px-4 pb-4 pt-3">
        <Avatar personId={CURRENT_USER_ID} size={30} className="mt-0.5" />
        <div className="flex min-h-[34px] flex-1 items-center rounded-lg border border-line bg-canvas px-3 py-1.5 focus-within:border-line-strong">
          <MentionInput
            ref={inputRef}
            value={draft}
            onChange={setDraft}
            onSubmit={submit}
            placeholder="Write a comment…"
            aria-label="Write a comment"
            className="text-[14px] leading-snug"
          />
        </div>
      </div>
    </article>
  );
}

function LifeEventBanner({ post }: { post: Post }) {
  const event = post.lifeEvent!;
  const meta = LIFE_EVENTS[event.type];
  const subject = post.tagged[0] ? getPerson(post.tagged[0]) : undefined;
  const dateLabel =
    event.type === "memorial" && subject ? lifespan(subject) : longDate(event.date);

  return (
    <div
      className="mx-4 mt-3 flex items-center gap-3 rounded-md px-3.5 py-3"
      style={{ background: meta.bg }}
    >
      <LifeEventGlyph type={event.type} size={36} inset />
      <div className="min-w-0">
        <div className="text-[12px] font-medium" style={{ color: meta.color }}>
          {meta.label} · {dateLabel}
        </div>
        <div className="font-serif text-[20px] leading-tight text-ink">{event.title}</div>
      </div>
    </div>
  );
}
