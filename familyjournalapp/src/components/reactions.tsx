"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { CURRENT_USER_ID } from "@/lib/data";
import { fullName, getPerson, kinship } from "@/lib/family";
import { useStore } from "@/lib/store";
import type { Post, ReactionType } from "@/lib/types";
import { useDismiss } from "@/lib/use-dismiss";
import { Avatar } from "./avatar";
import { CloseIcon, HeartIcon } from "./icons";
import { Sheet } from "./sheet";

export const REACTIONS: { type: ReactionType; emoji: string; label: string }[] = [
  { type: "love", emoji: "❤️", label: "Love" },
  { type: "like", emoji: "👍", label: "Like" },
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

// "Carol and 7 others"
export function ReactionSummary({ post }: { post: Post }) {
  const [open, setOpen] = useState(false);
  if (!post.reactions.length) return null;

  const counts = countsByType(post);
  const others = post.reactions.filter((r) => r.personId !== CURRENT_USER_ID);
  const mine = others.length !== post.reactions.length;
  const lead = others[0] && getPerson(others[0].personId).firstName;
  const rest = others.length - 1;
  const label = mine
    ? others.length
      ? `You and ${others.length} other${others.length > 1 ? "s" : ""}`
      : "You"
    : rest > 0
      ? `${lead} and ${rest} other${rest > 1 ? "s" : ""}`
      : lead;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-[14px] text-ink-2 hover:text-ink"
      >
        <span className="flex -space-x-0.5 text-[13px]">
          {counts.slice(0, 3).map(([type]) => (
            <span key={type}>{emojiFor(type)}</span>
          ))}
        </span>
        {label}
      </button>
      {open && <ReactionsSheet post={post} onClose={() => setOpen(false)} />}
    </>
  );
}

function ReactionsSheet({ post, onClose }: { post: Post; onClose: () => void }) {
  const [tab, setTab] = useState<ReactionType | "all">("all");
  const counts = countsByType(post);
  const list = post.reactions.filter((r) => tab === "all" || r.type === tab);

  return (
    <Sheet label="Reactions" onClose={onClose}>
      <div className="flex items-center gap-1 border-b border-line px-2">
        <div className="no-scrollbar flex flex-1 overflow-x-auto">
          <Tab active={tab === "all"} onClick={() => setTab("all")}>
            All {post.reactions.length}
          </Tab>
          {counts.map(([type, n]) => (
            <Tab key={type} active={tab === type} onClick={() => setTab(type)}>
              {emojiFor(type)} {n}
            </Tab>
          ))}
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-hover"
        >
          <CloseIcon size={20} />
        </button>
      </div>
      <ul className="overflow-y-auto py-2">
        {list.map((r) => (
          <li key={r.personId}>
            <Link
              href={`/people/${r.personId}`}
              className="flex items-center gap-3 px-4 py-2 hover:bg-hover"
            >
              <Avatar personId={r.personId} size={44} />
              <span className="flex-1 leading-tight">
                <span className="block text-[15px] font-semibold">
                  {fullName(getPerson(r.personId))}
                </span>
                <span className="text-[13px] text-ink-3">
                  {r.personId === CURRENT_USER_ID ? "You" : kinship(CURRENT_USER_ID, r.personId)}
                </span>
              </span>
              <span className="text-[20px]">{emojiFor(r.type)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}

function Tab({
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
      className={`-mb-px shrink-0 border-b-2 px-3 py-3.5 text-[14px] ${
        active ? "border-ink font-semibold text-ink" : "border-transparent text-ink-3"
      }`}
    >
      {children}
    </button>
  );
}

// Tap to love; hold (touch) or hover (mouse) for the other reactions.
export function ReactButton({ post }: { post: Post }) {
  const { react } = useStore();
  const [picker, setPicker] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const wrap = useRef<HTMLDivElement>(null);
  const longPressed = useRef(false);
  useDismiss(wrap, picker, () => setPicker(false));

  const mine = post.reactions.find((r) => r.personId === CURRENT_USER_ID);

  const later = (fn: () => void, ms: number) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(fn, ms);
  };

  return (
    <div
      ref={wrap}
      className="relative"
      onPointerEnter={(e) => e.pointerType === "mouse" && later(() => setPicker(true), 450)}
      onPointerLeave={(e) => e.pointerType === "mouse" && later(() => setPicker(false), 250)}
    >
      <button
        aria-label={mine ? `Remove ${mine.type}` : "Love"}
        onPointerDown={(e) => {
          if (e.pointerType === "mouse") return;
          longPressed.current = false;
          later(() => {
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
          react(post.id, mine?.type ?? "love");
        }}
        className="-ml-2 flex h-10 w-10 select-none items-center justify-center rounded-full [-webkit-touch-callout:none] hover:bg-hover"
      >
        {!mine ? (
          <HeartIcon size={25} />
        ) : mine.type === "love" ? (
          <HeartIcon size={25} filled className="text-signal" />
        ) : (
          <span className="text-[21px] leading-none">{emojiFor(mine.type)}</span>
        )}
      </button>
      {picker && (
        <div
          role="menu"
          className="absolute bottom-full left-[-8px] z-20 mb-1 flex gap-0.5 rounded-full bg-surface p-1.5 shadow-pop ring-1 ring-line"
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
              className={`flex h-10 w-10 items-center justify-center rounded-full text-[24px] transition-transform hover:-translate-y-1 hover:scale-110 ${
                mine?.type === r.type ? "bg-sunken" : ""
              }`}
            >
              {r.emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
