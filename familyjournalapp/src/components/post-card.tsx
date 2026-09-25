"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { CURRENT_USER_ID } from "@/lib/data";
import { eventCover, fullName, getPerson, kinship, lifespan, longDate, relativeTime } from "@/lib/family";
import { lifeEventLabel } from "@/lib/life-events";
import { useStore } from "@/lib/store";
import type { Photo, Post } from "@/lib/types";
import { Avatar } from "./avatar";
import { CommentIcon, MoreIcon } from "./icons";
import { MentionInput } from "./mention-input";
import { MentionText } from "./mention-text";
import { ReactionBar, ReactionSummary } from "./reactions";

function Name({ id }: { id: string }) {
  return (
    <Link href={`/people/${id}`} className="font-semibold hover:underline">
      {id === CURRENT_USER_ID ? "You" : fullName(getPerson(id))}
    </Link>
  );
}

function Byline({ post }: { post: Post }) {
  const tagged = post.tagged.filter((id) => id !== post.authorId);
  const [first, ...rest] = tagged;
  return (
    <span>
      <Name id={post.authorId} />
      {first && (
        <>
          <span className="text-ink-2"> with </span>
          <Name id={first} />
        </>
      )}
      {rest.length === 1 && (
        <>
          <span className="text-ink-2"> and </span>
          <Name id={rest[0]} />
        </>
      )}
      {rest.length > 1 && (
        <span className="text-ink-2">
          {" "}
          and{" "}
          <span className="font-semibold text-ink" title={rest.map((id) => fullName(getPerson(id))).join(", ")}>
            {rest.length} others
          </span>
        </span>
      )}
    </span>
  );
}

function eventLine(post: Post) {
  const event = post.lifeEvent!;
  const subject = post.tagged[0] ? getPerson(post.tagged[0]) : undefined;
  const when =
    (event.type === "memorial" || event.type === "passing") && subject
      ? lifespan(subject)
      : longDate(event.date);
  return `${lifeEventLabel(event)} · ${when}`;
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
  const cover = eventCover(post);
  const photos = post.photos?.length ? post.photos : cover ? [cover] : [];

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    addComment(post.id, text);
    setDraft("");
    setShowAll(true);
  };

  return (
    <article className="py-5">
      <header className="flex items-center gap-3 px-4">
        <Link href={`/people/${post.authorId}`} className="shrink-0">
          <Avatar personId={post.authorId} size={38} />
        </Link>
        <div className="min-w-0 flex-1 text-[15px] leading-snug">
          <Byline post={post} />
          <div className="text-[13px] text-ink-3">
            {relation && <>{relation} · </>}
            <time dateTime={post.createdAt}>{relativeTime(post.createdAt)}</time>
          </div>
        </div>
        <button aria-label="More" className="-mr-2 flex h-9 w-9 items-center justify-center rounded-full text-ink-3 hover:bg-hover">
          <MoreIcon size={20} />
        </button>
      </header>

      {photos.length > 0 ? (
        <Media post={post} photos={photos} />
      ) : (
        post.lifeEvent && (
          <div className="px-4 pt-4">
            <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-3">
              {eventLine(post)}
            </div>
            <h3 className="display mt-1.5 text-[30px]">{post.lifeEvent.title}</h3>
          </div>
        )
      )}

      {post.text && (
        <p className="whitespace-pre-line px-4 pt-3 text-[15px] leading-[1.5]">
          <MentionText text={post.text} />
        </p>
      )}

      <div className="flex items-start gap-2 px-4 pt-3">
        <div className="min-w-0 flex-1">
          <ReactionBar post={post} />
        </div>
        <button
          onClick={() => inputRef.current?.focus()}
          aria-label="Comment"
          className="-mr-2 flex h-8 w-10 shrink-0 items-center justify-center rounded-full hover:bg-hover"
        >
          <CommentIcon size={23} />
        </button>
      </div>
      <div className="px-4 pt-1.5">
        <ReactionSummary post={post} />
      </div>

      {(comments.length > 0 || hidden > 0) && (
        <div className="space-y-1 px-4 pt-1 text-[14px] leading-snug">
          {hidden > 0 && (
            <button onClick={() => setShowAll(true)} className="pb-0.5 text-ink-3 hover:text-ink-2">
              View all {post.comments.length} comments
            </button>
          )}
          {comments.map((c) => (
            <p key={c.id}>
              <Link href={`/people/${c.authorId}`} className="mr-1.5 font-semibold hover:underline">
                {fullName(getPerson(c.authorId))}
              </Link>
              <MentionText text={c.text} />
            </p>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2.5 px-4 pt-3">
        <Avatar personId={CURRENT_USER_ID} size={26} />
        <MentionInput
          ref={inputRef}
          value={draft}
          onChange={setDraft}
          onSubmit={submit}
          placeholder="Add a comment…"
          aria-label="Add a comment"
          className="py-1 text-[14px] leading-snug"
        />
        {draft.trim() && (
          <button onClick={submit} className="text-[14px] font-semibold">
            Post
          </button>
        )}
      </div>
    </article>
  );
}

function PostPhoto({ photo, className, sizes }: { photo: Photo; className: string; sizes: string }) {
  return (
    <Image
      src={photo.src}
      alt={photo.alt}
      width={photo.width}
      height={photo.height}
      sizes={sizes}
      unoptimized={photo.src.startsWith("blob:")}
      draggable={false}
      className={`bg-sunken object-cover ${className}`}
    />
  );
}

function EventOverlay({ post }: { post: Post }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 via-black/25 to-transparent px-5 pb-5 pt-20 text-white">
      <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-white/80">
        {eventLine(post)}
      </div>
      <div className="display mt-1.5 text-[30px] [text-wrap:balance]">{post.lifeEvent!.title}</div>
    </div>
  );
}

function Media({ post, photos }: { post: Post; photos: Photo[] }) {
  if (photos.length === 1) {
    const [photo] = photos;
    const tall = photo.height > photo.width;
    return (
      <div className="px-4 pt-3">
        <div className="relative overflow-hidden rounded-[14px]">
          <PostPhoto
            photo={photo}
            sizes="(min-width: 640px) 568px, 100vw"
            className={`w-full ${tall ? "aspect-[4/5]" : "aspect-[4/3]"}`}
          />
          {post.lifeEvent && <EventOverlay post={post} />}
        </div>
      </div>
    );
  }

  // Several photos: a swipeable row that shows the next one peeking in.
  return (
    <div className="no-scrollbar mt-3 flex snap-x snap-mandatory gap-2 overflow-x-auto scroll-px-4 px-4">
      {photos.map((photo, i) => (
        <div
          key={photo.src}
          className="relative w-[82%] shrink-0 snap-start overflow-hidden rounded-[14px] sm:w-[76%]"
        >
          <PostPhoto photo={photo} sizes="(min-width: 640px) 440px, 82vw" className="aspect-[4/5] w-full" />
          {i === 0 && post.lifeEvent && <EventOverlay post={post} />}
          <span className="absolute right-3 top-3 rounded-full bg-black/55 px-2 py-0.5 text-[12px] font-medium text-white">
            {i + 1}/{photos.length}
          </span>
        </div>
      ))}
    </div>
  );
}
