"use client";

import { useEffect, useRef, useState } from "react";
import { useDismiss } from "@/lib/use-dismiss";
import { CloseIcon, SearchIcon } from "./icons";

type EmojiEntry = { emoji: string; name: string };
type EmojiGroup = { slug: string; name: string; emojis: EmojiEntry[] };
type RawGroup = { slug: string; name: string; emojis: (EmojiEntry & { emoji_version: string })[] };

// Skip emoji newer than this so nobody sees empty boxes on older phones.
const MAX_EMOJI_VERSION = 14;

const DEFAULT_RECENTS = ["❤️", "🥹", "😂", "🎉", "🙏", "👏", "😮", "😢"];
const RECENTS_KEY = "fj.recentEmoji";

const GROUP_ICONS: Record<string, string> = {
  smileys_emotion: "😀",
  people_body: "👋",
  animals_nature: "🐻",
  food_drink: "🍎",
  travel_places: "🚗",
  activities: "⚽",
  objects: "💡",
  symbols: "❤️",
  flags: "🏳️",
};

// The dataset is ~400 KB of JSON, so it loads the first time a picker opens and is shared after that.
let cache: Promise<EmojiGroup[]> | null = null;
function loadEmoji() {
  cache ??= import("unicode-emoji-json/data-by-group.json").then((mod) =>
    (mod.default as unknown as RawGroup[])
      .map((g) => ({
        slug: g.slug,
        name: g.name,
        emojis: g.emojis
          .filter((e) => parseFloat(e.emoji_version) <= MAX_EMOJI_VERSION)
          .map(({ emoji, name }) => ({ emoji, name })),
      })),
  );
  return cache;
}

function readRecents(): string[] {
  try {
    const saved = JSON.parse(localStorage.getItem(RECENTS_KEY) ?? "[]");
    if (Array.isArray(saved) && saved.length) return saved.slice(0, 16);
  } catch {}
  return DEFAULT_RECENTS;
}

function saveRecent(emoji: string) {
  try {
    const next = [emoji, ...readRecents().filter((e) => e !== emoji)].slice(0, 16);
    localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  } catch {}
}

// Popover above its trigger on larger screens; bottom sheet on phones.
export function EmojiPicker({
  selected,
  onPick,
  onClose,
}: {
  selected?: string;
  onPick: (emoji: string) => void;
  onClose: () => void;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const [groups, setGroups] = useState<EmojiGroup[] | null>(null);
  const [query, setQuery] = useState("");
  const [recents] = useState(readRecents);
  useDismiss(panel, true, onClose);

  useEffect(() => {
    let live = true;
    loadEmoji().then((g) => live && setGroups(g));
    return () => {
      live = false;
    };
  }, []);

  const pick = (emoji: string) => {
    saveRecent(emoji);
    onPick(emoji);
  };

  const q = query.trim().toLowerCase();
  // Match the start of any word, so "pie" finds pie but not "one-piece swimsuit".
  const results =
    q && groups
      ? groups
          .flatMap((g) => g.emojis)
          .filter((e) => e.name.split(/[\s-]+/).some((word) => word.startsWith(q)))
      : null;

  const jump = (slug: string) => {
    const el = scroller.current?.querySelector<HTMLElement>(`[data-group="${slug}"]`);
    if (el && scroller.current) scroller.current.scrollTo({ top: el.offsetTop - 4 });
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 sm:hidden" aria-hidden="true" />
      <div
        ref={panel}
        role="dialog"
        aria-label="Choose a reaction"
        className="fixed inset-x-0 bottom-0 z-50 flex h-[62dvh] flex-col overflow-hidden rounded-t-2xl bg-surface pb-[env(safe-area-inset-bottom)] shadow-pop sm:absolute sm:inset-x-auto sm:bottom-full sm:left-0 sm:mb-2 sm:h-[380px] sm:w-[352px] sm:rounded-2xl sm:pb-0 sm:ring-1 sm:ring-line"
      >
        <div className="flex items-center gap-2 px-3 pb-2 pt-3">
          <label className="flex h-10 flex-1 items-center gap-2 rounded-full bg-sunken px-3.5">
            <SearchIcon size={16} className="text-ink-3" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search emoji"
              className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-3"
            />
          </label>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-hover sm:hidden"
          >
            <CloseIcon size={20} />
          </button>
        </div>

        <div ref={scroller} className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-2">
          {results ? (
            results.length ? (
              <Grid emojis={results} selected={selected} onPick={pick} />
            ) : (
              <p className="py-10 text-center text-[14px] text-ink-3">No emoji for “{query}”</p>
            )
          ) : (
            <>
              <Section title="Frequently used">
                <Grid emojis={recents.slice(0, 8).map((emoji) => ({ emoji, name: emoji }))} selected={selected} onPick={pick} />
              </Section>
              {groups ? (
                groups.map((g) => (
                  <Section key={g.slug} title={g.name} slug={g.slug}>
                    <Grid emojis={g.emojis} selected={selected} onPick={pick} />
                  </Section>
                ))
              ) : (
                <p className="py-8 text-center text-[13px] text-ink-3">Loading…</p>
              )}
            </>
          )}
        </div>

        {!results && groups && (
          <nav className="flex justify-between border-t border-line px-2 py-1" aria-label="Emoji categories">
            {groups.map((g) => (
              <button
                key={g.slug}
                onClick={() => jump(g.slug)}
                title={g.name}
                aria-label={g.name}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-[18px] grayscale hover:bg-hover hover:grayscale-0"
              >
                {GROUP_ICONS[g.slug] ?? g.emojis[0]?.emoji}
              </button>
            ))}
          </nav>
        )}
      </div>
    </>
  );
}

function Section({ title, slug, children }: { title: string; slug?: string; children: React.ReactNode }) {
  return (
    <section data-group={slug}>
      <h3 className="sticky top-0 z-10 bg-surface/95 px-1.5 pb-1 pt-2 text-[12px] font-semibold text-ink-3 backdrop-blur">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Grid({
  emojis,
  selected,
  onPick,
}: {
  emojis: EmojiEntry[];
  selected?: string;
  onPick: (emoji: string) => void;
}) {
  return (
    <div className="grid grid-cols-8">
      {emojis.map((e) => (
        <button
          key={e.emoji}
          onClick={() => onPick(e.emoji)}
          title={e.name}
          aria-label={e.name}
          className={`flex aspect-square items-center justify-center rounded-lg text-[26px] leading-none hover:bg-hover ${
            selected === e.emoji ? "bg-sunken ring-1 ring-line-strong" : ""
          }`}
        >
          {e.emoji}
        </button>
      ))}
    </div>
  );
}
