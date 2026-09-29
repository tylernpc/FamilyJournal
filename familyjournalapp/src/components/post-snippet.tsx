"use client";

import Image from "next/image";
import { peopleInPost, relativeTime } from "@/lib/family";
import { useClock, useFamily } from "@/lib/family-context";
import { lifeEventLabel } from "@/lib/life-events";
import type { Post } from "@/lib/types";
import { Avatar } from "./avatar";

// Compact post row for side panels and profile lists.
export function PostSnippet({
  post,
  active = false,
  onHover,
  onClick,
}: {
  post: Post;
  active?: boolean;
  onHover?: (hovering: boolean) => void;
  onClick?: () => void;
}) {
  const { graph } = useFamily();
  const { now, timeZone } = useClock();
  const involved = peopleInPost(post);
  const author = graph.getPerson(post.authorId);
  const meta = post.lifeEvent && { label: lifeEventLabel(post.lifeEvent) };
  const thumb = post.photos[0];

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
      onFocus={() => onHover?.(true)}
      onBlur={() => onHover?.(false)}
      className={`flex w-full gap-3 rounded-md border px-3 py-2.5 text-left transition-colors ${
        active ? "border-line-strong bg-sunken" : "border-transparent hover:bg-hover"
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="flex -space-x-1.5">
            {involved.slice(0, 4).map((id) => (
              <Avatar key={id} personId={id} size={20} className="rounded-full ring-2 ring-surface" />
            ))}
          </span>
          <span className="truncate text-[12px] text-ink-3">
            {author.firstName} · {relativeTime(post.createdAt, now, timeZone)}
          </span>
        </div>
        {meta && (
          <div className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
            {meta.label}
          </div>
        )}
        <p className={`line-clamp-2 text-[14px] leading-snug text-ink ${meta ? "mt-0.5" : "mt-1.5"}`}>
          {post.lifeEvent ? <span className="font-medium">{post.lifeEvent.title}. </span> : null}
          {post.text}
        </p>
      </div>
      {thumb && (
        <Image
          src={thumb.src}
          alt=""
          width={56}
          height={56}
          className="mt-0.5 h-14 w-14 shrink-0 rounded-lg object-cover"
        />
      )}
    </button>
  );
}
