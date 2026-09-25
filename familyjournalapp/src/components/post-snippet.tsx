"use client";

import Image from "next/image";
import { getPerson, peopleInPost, relativeTime } from "@/lib/family";
import type { Post } from "@/lib/types";
import { Avatar } from "./avatar";
import { LIFE_EVENTS } from "./life-event";

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
  const involved = peopleInPost(post);
  const author = getPerson(post.authorId);
  const meta = post.lifeEvent && LIFE_EVENTS[post.lifeEvent.type];
  const thumb = post.photos?.[0];

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
            {author.firstName} · {relativeTime(post.createdAt)}
          </span>
        </div>
        {meta && (
          <div className="mt-1.5 text-[12px] font-medium" style={{ color: meta.color }}>
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
          width={112}
          height={112}
          className="mt-0.5 h-14 w-14 shrink-0 rounded object-cover"
        />
      )}
    </button>
  );
}
