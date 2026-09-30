"use client";

import Link from "next/link";
import { useState } from "react";
import { fullName } from "@/lib/family";
import { useFamily } from "@/lib/family-context";
import type { Reaction } from "@/lib/types";
import { Avatar } from "./avatar";
import { EmojiPicker } from "./emoji-picker";
import { CloseIcon, SmilePlusIcon } from "./icons";
import { Sheet } from "./sheet";

function countsByEmoji(reactions: Reaction[]) {
  const counts = new Map<string, number>();
  for (const r of reactions) counts.set(r.emoji, (counts.get(r.emoji) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

// Each emoji used on the post as a chip with its count, plus "+" for any other emoji.
// Tapping your own emoji again takes it back.
export function ReactionBar({
  reactions,
  onReact,
}: {
  reactions: Reaction[];
  onReact: (emoji: string | null) => void;
}) {
  const { me } = useFamily();
  const [picking, setPicking] = useState(false);
  const mine = reactions.find((r) => r.personId === me)?.emoji;
  const toggle = (emoji: string) => onReact(emoji === mine ? null : emoji);

  return (
    <div className="relative flex flex-wrap items-center gap-1.5">
      {countsByEmoji(reactions).map(([emoji, count]) => {
        const isMine = emoji === mine;
        return (
          <button
            key={emoji}
            onClick={() => toggle(emoji)}
            aria-pressed={isMine}
            aria-label={`${emoji} ${count}${isMine ? ", yours" : ""}`}
            className={`flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[14px] tabular-nums ${
              isMine
                ? "bg-ink font-semibold text-canvas"
                : "bg-sunken text-ink-2 hover:bg-hover hover:text-ink"
            }`}
          >
            <span className="text-[16px] leading-none">{emoji}</span>
            {count}
          </button>
        );
      })}
      {/* The picker anchors to the whole row so it lines up with the post, not the button. */}
      <div>
        <button
          onClick={() => setPicking((open) => !open)}
          aria-label="Add reaction"
          aria-expanded={picking}
          className={`flex h-8 w-10 items-center justify-center rounded-full ${
            picking ? "bg-ink text-canvas" : "bg-sunken text-ink-2 hover:bg-hover hover:text-ink"
          }`}
        >
          <SmilePlusIcon size={19} />
        </button>
        {picking && (
          <EmojiPicker
            selected={mine}
            onClose={() => setPicking(false)}
            onPick={(emoji) => {
              toggle(emoji);
              setPicking(false);
            }}
          />
        )}
      </div>
    </div>
  );
}

// "Carol, Luis and 6 others" — opens the list of who reacted with what.
export function ReactionSummary({ reactions }: { reactions: Reaction[] }) {
  const { me, graph } = useFamily();
  const [open, setOpen] = useState(false);
  if (!reactions.length) return null;

  const names = reactions.map((r) => (r.personId === me ? "You" : graph.getPerson(r.personId).firstName));
  // "You" reads best first.
  names.sort((a, b) => (a === "You" ? -1 : b === "You" ? 1 : 0));
  const label =
    names.length <= 2
      ? names.join(" and ")
      : `${names.slice(0, 2).join(", ")} and ${names.length - 2} other${names.length - 2 > 1 ? "s" : ""}`;

  return (
    <>
      <button onClick={() => setOpen(true)} className="text-[13px] text-ink-3 hover:text-ink-2">
        {label}
      </button>
      {open && <ReactionsSheet reactions={reactions} onClose={() => setOpen(false)} />}
    </>
  );
}

function ReactionsSheet({ reactions, onClose }: { reactions: Reaction[]; onClose: () => void }) {
  const { me, graph, href } = useFamily();
  const [tab, setTab] = useState<string>("all");
  const counts = countsByEmoji(reactions);
  const list = reactions.filter((r) => tab === "all" || r.emoji === tab);

  return (
    <Sheet label="Reactions" onClose={onClose}>
      <div className="flex items-center gap-1 border-b border-line px-2">
        <div className="no-scrollbar flex flex-1 overflow-x-auto">
          <Tab active={tab === "all"} onClick={() => setTab("all")}>
            All {reactions.length}
          </Tab>
          {counts.map(([emoji, n]) => (
            <Tab key={emoji} active={tab === emoji} onClick={() => setTab(emoji)}>
              {emoji} {n}
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
              href={href(`/people/${r.personId}`)}
              className="flex items-center gap-3 px-4 py-2 hover:bg-hover"
            >
              <Avatar personId={r.personId} size={44} />
              <span className="flex-1 leading-tight">
                <span className="block text-[15px] font-semibold">{fullName(graph.getPerson(r.personId))}</span>
                <span className="text-[13px] text-ink-3">
                  {r.personId === me ? "You" : graph.kinship(me, r.personId)}
                </span>
              </span>
              <span className="text-[22px]">{r.emoji}</span>
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
