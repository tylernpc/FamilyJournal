"use client";

import { useRef, useState } from "react";
import { CURRENT_USER_ID, NOW, people } from "@/lib/data";
import { fullName, getPerson } from "@/lib/family";
import { useStore } from "@/lib/store";
import type { LifeEventType } from "@/lib/types";
import { useDismiss } from "@/lib/use-dismiss";
import { Avatar } from "./avatar";
import { CheckIcon, CloseIcon, MilestoneIcon, PhotoIcon, SearchIcon, TagIcon } from "./icons";
import { LIFE_EVENTS, LifeEventGlyph } from "./life-event";
import { MentionInput } from "./mention-input";

const EVENT_TYPES = Object.keys(LIFE_EVENTS) as LifeEventType[];

export function Composer({ initialTags = [] }: { initialTags?: string[] }) {
  const { addPost } = useStore();
  const [open, setOpen] = useState(initialTags.length > 0);
  const [text, setText] = useState("");
  const [tagged, setTagged] = useState<string[]>(initialTags);
  const [event, setEvent] = useState<{ type: LifeEventType; title: string; date: string } | null>(
    null,
  );
  const [picker, setPicker] = useState<"tags" | "event" | null>(null);

  const reset = () => {
    setText("");
    setTagged([]);
    setEvent(null);
    setPicker(null);
    setOpen(false);
  };

  const canPost = text.trim().length > 0 && (!event || event.title.trim().length > 0);

  const submit = () => {
    if (!canPost) return;
    addPost({ text: text.trim(), tagged, lifeEvent: event ?? undefined });
    reset();
  };

  if (!open) {
    return (
      <div className="flex items-center gap-3 border-y border-line bg-surface p-4 sm:rounded-lg sm:border-x">
        <Avatar personId={CURRENT_USER_ID} size={40} />
        <button
          onClick={() => setOpen(true)}
          className="h-10 flex-1 rounded-lg border border-line bg-canvas px-3.5 text-left text-[15px] text-ink-3 hover:border-line-strong"
        >
          Share something with the family…
        </button>
        <button
          onClick={() => setOpen(true)}
          className="hidden h-10 items-center gap-2 rounded-md px-3 text-[14px] text-ink-2 hover:bg-hover sm:flex"
        >
          <PhotoIcon size={18} className="text-ink-3" />
          Photo
        </button>
        <button
          onClick={() => {
            setOpen(true);
            setEvent({ type: "birth", title: "", date: NOW.toISOString().slice(0, 10) });
          }}
          className="hidden h-10 items-center gap-2 rounded-md px-3 text-[14px] text-ink-2 hover:bg-hover sm:flex"
        >
          <MilestoneIcon size={18} className="text-ink-3" />
          Life event
        </button>
      </div>
    );
  }

  return (
    <div className="border-y border-line bg-surface sm:rounded-lg sm:border-x">
      <div className="flex gap-3 px-4 pt-4">
        <Avatar personId={CURRENT_USER_ID} size={40} />
        <div className="min-w-0 flex-1 pt-2">
          <MentionInput
            value={text}
            onChange={setText}
            rows={3}
            autoFocus
            placeholder={
              event ? "Tell the story behind it…" : "What's new? Use @ to mention someone."
            }
            aria-label="Post text"
            className="text-[15px] leading-relaxed"
          />
        </div>
      </div>

      {event && (
        <div className="mx-4 mt-3 rounded-md border border-line p-3">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-ink-2">Life event</span>
            <button
              onClick={() => setEvent(null)}
              className="rounded p-1 text-ink-3 hover:bg-hover hover:text-ink"
              aria-label="Remove life event"
            >
              <CloseIcon size={16} />
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Event type">
            {EVENT_TYPES.map((type) => {
              const active = event.type === type;
              return (
                <button
                  key={type}
                  role="radio"
                  aria-checked={active}
                  onClick={() => setEvent({ ...event, type })}
                  className={`flex h-8 items-center gap-1.5 rounded-md border pl-1 pr-2.5 text-[13px] ${
                    active
                      ? "border-ink bg-surface font-medium text-ink"
                      : "border-line text-ink-2 hover:border-line-strong"
                  }`}
                >
                  <LifeEventGlyph type={type} size={22} />
                  {LIFE_EVENTS[type].label}
                </button>
              );
            })}
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_160px]">
            <input
              value={event.title}
              onChange={(e) => setEvent({ ...event, title: e.target.value })}
              placeholder={
                event.type === "birth"
                  ? "Full name, e.g. Theo James Okafor"
                  : event.type === "newJob"
                    ? "e.g. Started at Pacheco & Reyes"
                    : "Title"
              }
              className="h-9 rounded-md border border-line bg-canvas px-3 text-[14px] outline-none placeholder:text-ink-3 focus:border-line-strong"
              aria-label="Event title"
            />
            <input
              type="date"
              value={event.date}
              onChange={(e) => setEvent({ ...event, date: e.target.value })}
              className="h-9 rounded-md border border-line bg-canvas px-3 text-[14px] text-ink outline-none focus:border-line-strong"
              aria-label="Event date"
            />
          </div>
        </div>
      )}

      {tagged.length > 0 && (
        <div className="mx-4 mt-3 flex flex-wrap items-center gap-1.5">
          <span className="mr-0.5 text-[13px] text-ink-3">With</span>
          {tagged.map((id) => (
            <span
              key={id}
              className="flex h-7 items-center gap-1.5 rounded-full border border-line bg-canvas pl-0.5 pr-1 text-[13px]"
            >
              <Avatar personId={id} size={22} />
              {fullName(getPerson(id))}
              <button
                onClick={() => setTagged(tagged.filter((t) => t !== id))}
                className="rounded-full p-0.5 text-ink-3 hover:bg-hover hover:text-ink"
                aria-label={`Remove ${fullName(getPerson(id))}`}
              >
                <CloseIcon size={14} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center gap-1 border-t border-line px-3 py-2">
        <ToolbarButton label="Photo" onClick={() => {}}>
          <PhotoIcon size={18} />
        </ToolbarButton>
        <div className="relative">
          <ToolbarButton
            label="Tag people"
            active={picker === "tags"}
            onClick={() => setPicker(picker === "tags" ? null : "tags")}
          >
            <TagIcon size={18} />
          </ToolbarButton>
          {picker === "tags" && (
            <TagPicker selected={tagged} onChange={setTagged} onClose={() => setPicker(null)} />
          )}
        </div>
        <ToolbarButton
          label="Life event"
          active={!!event}
          onClick={() =>
            setEvent(event ? null : { type: "birth", title: "", date: NOW.toISOString().slice(0, 10) })
          }
        >
          <MilestoneIcon size={18} />
        </ToolbarButton>

        <span className="ml-auto hidden text-[12px] text-ink-3 sm:inline">
          Visible to everyone in the family
        </span>
        <button
          onClick={reset}
          className="ml-2 h-8 rounded-md px-3 text-[14px] text-ink-2 hover:bg-hover"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={!canPost}
          className="h-8 rounded-md bg-accent px-4 text-[14px] font-medium text-white hover:bg-accent-hover disabled:opacity-40 dark:text-[#10180f]"
        >
          Post
        </button>
      </div>
    </div>
  );
}

function ToolbarButton({
  label,
  active = false,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`flex h-8 items-center gap-1.5 rounded-md px-2 text-[13px] ${
        active ? "bg-sunken text-ink" : "text-ink-2 hover:bg-hover hover:text-ink"
      }`}
    >
      {children}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function TagPicker({
  selected,
  onChange,
  onClose,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  useDismiss(ref, true, onClose);

  const list = people.filter(
    (p) => p.id !== CURRENT_USER_ID && fullName(p).toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div
      ref={ref}
      className="absolute bottom-full left-0 z-30 mb-2 w-72 overflow-hidden rounded-lg border border-line bg-surface shadow-pop"
    >
      <div className="flex items-center gap-2 border-b border-line px-3">
        <SearchIcon size={16} className="text-ink-3" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Who was there?"
          className="h-10 flex-1 bg-transparent text-[14px] outline-none placeholder:text-ink-3"
        />
      </div>
      <ul className="max-h-72 overflow-y-auto py-1">
        {list.map((p) => {
          const checked = selected.includes(p.id);
          return (
            <li key={p.id}>
              <button
                onClick={() =>
                  onChange(checked ? selected.filter((s) => s !== p.id) : [...selected, p.id])
                }
                className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-[14px] hover:bg-hover"
              >
                <Avatar personId={p.id} size={26} />
                <span className="flex-1">
                  {fullName(p)}
                  {p.lifeStatus === "deceased" && (
                    <span className="ml-1.5 text-[12px] text-ink-3">In memory</span>
                  )}
                </span>
                <span
                  className={`flex h-[18px] w-[18px] items-center justify-center rounded border ${
                    checked ? "border-accent bg-accent text-white" : "border-line-strong"
                  }`}
                >
                  {checked && <CheckIcon size={14} strokeWidth={2} />}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
