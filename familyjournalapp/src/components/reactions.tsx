"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { CURRENT_USER_ID } from "@/lib/data";
import { fullName, getPerson, kinship } from "@/lib/family";
import { useStore } from "@/lib/store";
import type { Post, ReactionType } from "@/lib/types";
import { useDismiss } from "@/lib/use-dismiss";
import { Avatar } from "./avatar";
import { CloseIcon, CommentIcon, ThumbIcon } from "./icons";

export const REACTIONS: { type: ReactionType; emoji: string; label: string }[] = [
  { type: "like", emoji: "👍", label: "Like" },
  { type: "love", emoji: "❤️", label: "Love" },
  { type: "haha", emoji: "😆", label: "Haha" },
  { type: "wow", emoji: "😮", label: "Wow" },
  { type: "sad", emoji: "😢", label: "Sad" },
];

const emojiFor = (t: ReactionType) => REACTIONS.find((r) => r.type === t)!.emoji;

function countsByType(post: Post) {
  const counts = new Map<ReactionType, number>();
  for (const r of post.reactions) counts.set(r.type, (counts.get(r.type) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

export function ReactionSummary({ post }: { post: Post }) {
  const [open, setOpen] = useState(false);
  const counts = countsByType(post);
  if (!post.reactions.length) return <span />;

  const mine = post.reactions.some((r) => r.personId === CURRENT_USER_ID);
  const others = post.reactions.filter((r) => r.personId !== CURRENT_USER_ID);
  const label = mine
    ? others.length
      ? `You and ${others.length} other${others.length > 1 ? "s" : ""}`
      : "You"
    : others.length === 1
      ? fullName(getPerson(others[0].personId))
      : `${getPerson(others[0].personId).firstName} and ${others.length - 1} others`;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded text-[13px] text-ink-3 hover:text-ink-2 hover:underline"
      >
        <span className="flex -space-x-1">
          {counts.slice(0, 3).map(([type]) => (
            <span
              key={type}
              className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-surface text-[11px] ring-2 ring-surface"
            >
              {emojiFor(type)}
            </span>
          ))}
        </span>
        {label}
      </button>
      {open && <ReactionsDialog post={post} onClose={() => setOpen(false)} />}
    </>
  );
}

function ReactionsDialog({ post, onClose }: { post: Post; onClose: () => void }) {
  const [tab, setTab] = useState<ReactionType | "all">("all");
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(ref, true, onClose);
  const counts = countsByType(post);
  const list = post.reactions.filter((r) => tab === "all" || r.type === tab);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 sm:items-center">
      <div
        ref={ref}
        role="dialog"
        aria-label="Reactions"
        className="flex max-h-[70dvh] w-full max-w-sm flex-col rounded-t-xl bg-surface shadow-pop sm:rounded-xl"
      >
        <div className="flex items-center border-b border-line px-2">
          <div className="flex flex-1 gap-1 overflow-x-auto">
            <TabButton active={tab === "all"} onClick={() => setTab("all")}>
              All {post.reactions.length}
            </TabButton>
            {counts.map(([type, n]) => (
              <TabButton key={type} active={tab === type} onClick={() => setTab(type)}>
                {emojiFor(type)} {n}
              </TabButton>
            ))}
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-ink-3 hover:bg-hover hover:text-ink"
            aria-label="Close"
          >
            <CloseIcon size={18} />
          </button>
        </div>
        <ul className="overflow-y-auto py-1.5">
          {list.map((r) => {
            const person = getPerson(r.personId);
            return (
              <li key={r.personId}>
                <Link
                  href={`/people/${person.id}`}
                  className="flex items-center gap-3 px-4 py-2 hover:bg-hover"
                >
                  <span className="relative">
                    <Avatar personId={person.id} size={36} />
                    <span className="absolute -bottom-1 -right-1 text-[13px]">
                      {emojiFor(r.type)}
                    </span>
                  </span>
                  <span className="leading-tight">
                    <span className="block text-[14px] font-medium">{fullName(person)}</span>
                    <span className="text-[12px] text-ink-3">
                      {kinship(CURRENT_USER_ID, person.id)}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`-mb-px shrink-0 border-b-2 px-3 py-3 text-[13px] ${
        active ? "border-ink font-medium text-ink" : "border-transparent text-ink-3 hover:text-ink-2"
      }`}
    >
      {children}
    </button>
  );
}

export function PostActions({ post, onComment }: { post: Post; onComment: () => void }) {
  const { react } = useStore();
  const [picker, setPicker] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const mine = post.reactions.find((r) => r.personId === CURRENT_USER_ID);
  const current = mine && REACTIONS.find((r) => r.type === mine.type)!;

  const wrap = useRef<HTMLDivElement>(null);
  const longPressed = useRef(false);
  useDismiss(wrap, picker, () => setPicker(false));

  const show = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setPicker(true), 350);
  };
  const hide = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setPicker(false), 250);
  };

  return (
    <div className="grid grid-cols-2 gap-1">
      <div
        ref={wrap}
        className="relative"
        // Mouse: hover opens the picker. Touch: press and hold, like the native apps.
        onPointerEnter={(e) => e.pointerType === "mouse" && show()}
        onPointerLeave={(e) => e.pointerType === "mouse" && hide()}
      >
        <button
          onPointerDown={(e) => {
            if (e.pointerType === "mouse") return;
            longPressed.current = false;
            clearTimeout(timer.current);
            timer.current = setTimeout(() => {
              longPressed.current = true;
              setPicker(true);
            }, 400);
          }}
          onPointerUp={() => clearTimeout(timer.current)}
          onPointerCancel={() => clearTimeout(timer.current)}
          onContextMenu={(e) => e.preventDefault()}
          onClick={() => {
            if (longPressed.current) {
              longPressed.current = false;
              return;
            }
            setPicker(false);
            react(post.id, mine?.type ?? "like");
          }}
          className={`flex h-10 w-full select-none items-center justify-center gap-2 rounded-md text-[14px] [-webkit-touch-callout:none] hover:bg-hover ${
            current ? "font-medium text-accent-ink" : "text-ink-2"
          }`}
        >
          {current ? (
            <span className="text-[15px] leading-none">{current.emoji}</span>
          ) : (
            <ThumbIcon size={18} />
          )}
          {current ? current.label : "Like"}
        </button>
        {picker && (
          <div
            role="menu"
            className="absolute bottom-full left-0 z-20 mb-1.5 flex gap-0.5 rounded-full border border-line bg-surface p-1 shadow-pop"
          >
            {REACTIONS.map((r) => (
              <button
                key={r.type}
                role="menuitem"
                title={r.label}
                aria-label={r.label}
                onClick={() => {
                  react(post.id, r.type);
                  setPicker(false);
                }}
                className={`flex h-10 w-10 items-center justify-center rounded-full text-[22px] transition-transform hover:-translate-y-0.5 hover:scale-110 ${
                  mine?.type === r.type ? "bg-sunken" : ""
                }`}
              >
                {r.emoji}
              </button>
            ))}
          </div>
        )}
      </div>
      <button
        onClick={onComment}
        className="flex h-10 items-center justify-center gap-2 rounded-md text-[14px] text-ink-2 hover:bg-hover"
      >
        <CommentIcon size={18} />
        Comment
      </button>
    </div>
  );
}
