"use client";

/* eslint-disable @next/next/no-img-element -- previews are local object URLs */

import { useState } from "react";
import { CURRENT_USER_ID, NOW, people } from "@/lib/data";
import { fullName, getPerson } from "@/lib/family";
import { useStore } from "@/lib/store";
import type { LifeEventType, Photo } from "@/lib/types";
import { Avatar } from "./avatar";
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon, CloseIcon, PlusIcon, SearchIcon } from "./icons";
import { LIFE_EVENTS } from "./life-event";
import { MentionInput } from "./mention-input";
import { Sheet, SheetHeader } from "./sheet";

const EVENT_TYPES = Object.keys(LIFE_EVENTS) as LifeEventType[];

type Step = "write" | "tag" | "event";

// Mounted once in the app shell; opened through the store.
export function ComposerHost() {
  const { composer } = useStore();
  if (!composer) return null;
  return <Composer initialTags={composer.tags} />;
}

function readPhoto(file: File): Promise<Photo> {
  const src = URL.createObjectURL(file);
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () =>
      resolve({ src, alt: file.name, width: img.naturalWidth, height: img.naturalHeight });
    img.src = src;
  });
}

function Composer({ initialTags }: { initialTags: string[] }) {
  const { addPost, closeComposer } = useStore();
  const [step, setStep] = useState<Step>("write");
  const [text, setText] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [tagged, setTagged] = useState<string[]>(initialTags);
  const [event, setEvent] = useState<{ type: LifeEventType; title: string; date: string } | null>(
    null,
  );

  const canPost =
    (text.trim().length > 0 || photos.length > 0) && (!event || event.title.trim().length > 0);

  const submit = () => {
    if (!canPost) return;
    addPost({ text: text.trim(), tagged, photos, lifeEvent: event ?? undefined });
    closeComposer();
  };

  if (step === "tag") {
    return (
      <Sheet label="Tag family" onClose={closeComposer}>
        <SheetHeader
          title="Who's in it?"
          left={<BackButton onClick={() => setStep("write")} />}
          right={<TextButton onClick={() => setStep("write")}>Done</TextButton>}
        />
        <TagList selected={tagged} onChange={setTagged} />
      </Sheet>
    );
  }

  if (step === "event") {
    return (
      <Sheet label="Life event" onClose={closeComposer}>
        <SheetHeader
          title="Life event"
          left={<BackButton onClick={() => setStep("write")} />}
          right={
            event && (
              <TextButton
                onClick={() => {
                  setEvent(null);
                  setStep("write");
                }}
              >
                Remove
              </TextButton>
            )
          }
        />
        <div className="overflow-y-auto">
          <ul className="px-4 py-2">
            {EVENT_TYPES.map((type) => (
              <li key={type}>
                <button
                  onClick={() =>
                    setEvent({
                      type,
                      title: event?.title ?? "",
                      date: event?.date ?? NOW.toISOString().slice(0, 10),
                    })
                  }
                  className="flex h-12 w-full items-center justify-between border-b border-line text-left text-[16px]"
                >
                  {LIFE_EVENTS[type].label}
                  {event?.type === type && <CheckIcon size={20} strokeWidth={2} />}
                </button>
              </li>
            ))}
          </ul>
          {event && (
            <div className="space-y-3 px-4 pb-6 pt-3">
              <input
                autoFocus
                value={event.title}
                onChange={(e) => setEvent({ ...event, title: e.target.value })}
                placeholder={
                  event.type === "birth"
                    ? "Their full name"
                    : event.type === "newJob"
                      ? "Where, and what role"
                      : "Give it a title"
                }
                className="h-11 w-full rounded-lg bg-sunken px-3.5 text-[15px] outline-none placeholder:text-ink-3"
                aria-label="Event title"
              />
              <input
                type="date"
                value={event.date}
                onChange={(e) => setEvent({ ...event, date: e.target.value })}
                className="h-11 w-full rounded-lg bg-sunken px-3.5 text-[15px] text-ink outline-none"
                aria-label="Event date"
              />
              <button
                onClick={() => setStep("write")}
                disabled={!event.title.trim()}
                className="h-11 w-full rounded-full bg-ink text-[15px] font-semibold text-canvas disabled:opacity-30"
              >
                Add to post
              </button>
            </div>
          )}
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet label="New post" onClose={closeComposer} wide>
      <SheetHeader
        title="New post"
        left={<TextButton onClick={closeComposer}>Cancel</TextButton>}
        right={
          <button
            onClick={submit}
            disabled={!canPost}
            className="h-8 rounded-full bg-ink px-4 text-[14px] font-semibold text-canvas disabled:opacity-25"
          >
            Share
          </button>
        }
      />

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex gap-3 px-4 pt-4">
          <Avatar personId={CURRENT_USER_ID} size={36} />
          <div className="min-w-0 flex-1 pt-1.5">
            {event && (
              <button
                onClick={() => setStep("event")}
                className="mb-2 block text-left"
              >
                <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
                  {LIFE_EVENTS[event.type].label}
                </span>
                <span className="display block text-[24px]">{event.title}</span>
              </button>
            )}
            <MentionInput
              value={text}
              onChange={setText}
              rows={4}
              autoFocus
              placeholder="What's happening with the family?"
              aria-label="Post text"
              className="text-[16px] leading-relaxed"
            />
          </div>
        </div>

        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
          {photos.map((p, i) => (
            <div key={p.src} className="relative h-28 w-24 shrink-0 overflow-hidden rounded-xl bg-sunken">
              <img src={p.src} alt="" className="h-full w-full object-cover" />
              <button
                onClick={() => setPhotos(photos.filter((_, j) => j !== i))}
                aria-label="Remove photo"
                className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white"
              >
                <CloseIcon size={14} strokeWidth={2} />
              </button>
            </div>
          ))}
          <label className="flex h-28 w-24 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl bg-sunken text-[12px] font-medium text-ink-2 hover:bg-hover">
            <PlusIcon size={22} />
            Photos
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={async (e) => {
                const files = [...(e.target.files ?? [])];
                const added = await Promise.all(files.map(readPhoto));
                setPhotos((all) => [...all, ...added]);
                e.target.value = "";
              }}
            />
          </label>
        </div>

        <ul className="mt-3 border-t border-line">
          <Row label="Tag family" onClick={() => setStep("tag")}>
            {tagged.length > 0 ? (
              <span className="flex items-center gap-2">
                <span className="flex -space-x-2">
                  {tagged.slice(0, 4).map((id) => (
                    <Avatar key={id} personId={id} size={24} className="ring-2 ring-surface" />
                  ))}
                </span>
                {tagged.length === 1 ? getPerson(tagged[0]).firstName : `${tagged.length} people`}
              </span>
            ) : (
              "None"
            )}
          </Row>
          <Row label="Life event" onClick={() => setStep("event")}>
            {event ? LIFE_EVENTS[event.type].label : "None"}
          </Row>
        </ul>
        <p className="px-4 py-3 text-[12px] text-ink-3">Only the Harlow family can see this.</p>
      </div>
    </Sheet>
  );
}

function Row({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <li className="border-b border-line">
      <button onClick={onClick} className="flex h-13 w-full items-center gap-3 px-4 text-left hover:bg-hover">
        <span className="flex-1 text-[15px]">{label}</span>
        <span className="text-[15px] text-ink-3">{children}</span>
        <ChevronRightIcon size={18} className="text-ink-3" />
      </button>
    </li>
  );
}

function TextButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="h-8 text-[15px] text-ink hover:opacity-70">
      {children}
    </button>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} aria-label="Back" className="-ml-2 flex h-8 w-8 items-center justify-center">
      <ChevronLeftIcon size={22} />
    </button>
  );
}

function TagList({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const list = people.filter(
    (p) => p.id !== CURRENT_USER_ID && fullName(p).toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <>
      <div className="px-4 py-3">
        <label className="flex h-10 items-center gap-2 rounded-full bg-sunken px-3.5">
          <SearchIcon size={16} className="text-ink-3" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search family"
            className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-3"
          />
        </label>
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto pb-4">
        {list.map((p) => {
          const checked = selected.includes(p.id);
          return (
            <li key={p.id}>
              <button
                onClick={() =>
                  onChange(checked ? selected.filter((s) => s !== p.id) : [...selected, p.id])
                }
                className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-hover"
              >
                <Avatar personId={p.id} size={40} />
                <span className="flex-1 text-[15px] font-medium">{fullName(p)}</span>
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full border-[1.5px] ${
                    checked ? "border-ink bg-ink text-canvas" : "border-line-strong"
                  }`}
                >
                  {checked && <CheckIcon size={14} strokeWidth={2.5} />}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}
