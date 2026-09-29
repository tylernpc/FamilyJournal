"use client";

/* eslint-disable @next/next/no-img-element -- previews are local object URLs */

import { useState, useTransition } from "react";
import { createPost, updatePost } from "@/app/f/[familyId]/actions";
import { useComposer } from "@/lib/composer";
import { fullName, localDate } from "@/lib/family";
import { useClock, useFamily } from "@/lib/family-context";
import {
  LIFE_EVENT_GROUPS,
  lifeEventHint,
  lifeEventLabel,
  type LifeEventType,
} from "@/lib/life-events";
import type { LifeEvent, Photo, Post } from "@/lib/types";
import { readPhoto, uploadPhoto } from "@/lib/upload";
import { Avatar } from "./avatar";
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon, CloseIcon, PlusIcon, SearchIcon } from "./icons";
import { MentionInput } from "./mention-input";
import { Sheet, SheetHeader } from "./sheet";

type Step = "write" | "tag" | "eventType" | "eventDetails";

// A photo on the post: already stored (mediaId set), or uploading in the background while you write.
type Attachment = { key: string; preview: Photo; mediaId?: string; error?: string };

// Mounted once in the app shell; opened through useComposer().
export function ComposerHost() {
  const { composer } = useComposer();
  if (!composer) return null;
  return <Composer initialTags={composer.tags} editing={composer.editing} />;
}

function Composer({ initialTags, editing }: { initialTags: string[]; editing?: Post }) {
  const { family, me } = useFamily();
  const { now, timeZone } = useClock();
  const { closeComposer } = useComposer();
  const [step, setStep] = useState<Step>("write");
  const [text, setText] = useState(editing?.text ?? "");
  const [photos, setPhotos] = useState<Attachment[]>(
    editing?.photos.map((p) => ({ key: p.mediaId ?? p.src, preview: p, mediaId: p.mediaId })) ?? [],
  );
  const [tagged, setTagged] = useState<string[]>(initialTags);
  const [event, setEvent] = useState<LifeEvent | null>(editing?.lifeEvent ?? null);
  const [error, setError] = useState<string>();
  const [sharing, startSharing] = useTransition();

  const uploading = photos.some((p) => !p.mediaId && !p.error);
  const eventReady = !event || (event.title.trim() && (event.type !== "custom" || event.label?.trim()));
  const hasContent = text.trim().length > 0 || photos.length > 0 || !!event;
  const canPost = hasContent && eventReady && !uploading && !sharing;
  const cover = photos.find((p) => !p.error)?.preview;

  const addFiles = async (files: File[]) => {
    for (const file of files) {
      const key = `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`;
      let preview: Photo;
      try {
        preview = await readPhoto(file);
      } catch (e) {
        setError((e as Error).message);
        continue;
      }
      setPhotos((all) => [...all, { key, preview }]);
      uploadPhoto(family.id, file, preview).then(
        (stored) => setPhotos((all) => all.map((p) => (p.key === key ? { ...p, mediaId: stored.mediaId } : p))),
        (e: Error) => setPhotos((all) => all.map((p) => (p.key === key ? { ...p, error: e.message } : p))),
      );
    }
  };

  const submit = () => {
    if (!canPost) return;
    const failed = photos.filter((p) => p.error);
    if (failed.length) {
      setError("Remove the photos that didn't upload, then share.");
      return;
    }
    setError(undefined);
    startSharing(async () => {
      const draft = {
        text: text.trim(),
        tagged,
        photos: photos.map((p) => ({ mediaId: p.mediaId!, alt: p.preview.alt })),
        lifeEvent: event ? { ...event, title: event.title.trim(), label: event.label?.trim() } : undefined,
      };
      const result = editing
        ? await updatePost(family.id, editing.id, draft)
        : await createPost(family.id, draft);
      if (!result.ok) return setError(result.error);
      closeComposer();
    });
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

  if (step === "eventType") {
    return (
      <Sheet label="Choose a life event" onClose={closeComposer}>
        <SheetHeader title="Life event" left={<BackButton onClick={() => setStep("write")} />} />
        <EventTypeList
          selected={event?.type}
          onPick={(type, label) => {
            setEvent((current) => ({
              type,
              label: type === "custom" ? (label ?? current?.label) : undefined,
              title: current?.title ?? "",
              date: current?.date ?? localDate(now, timeZone),
            }));
            setStep("eventDetails");
          }}
        />
      </Sheet>
    );
  }

  if (step === "eventDetails" && event) {
    return (
      <Sheet label="Life event details" onClose={closeComposer}>
        <SheetHeader
          title={lifeEventLabel(event)}
          left={<BackButton onClick={() => setStep("eventType")} />}
          right={
            <TextButton
              onClick={() => {
                setEvent(null);
                setStep("write");
              }}
            >
              Remove
            </TextButton>
          }
        />
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-4">
          <EventPreview event={event} photo={cover} subjectId={tagged[0] ?? me} />
          <div className="mt-4 space-y-3">
            {event.type === "custom" && (
              <Field label="What kind of event?">
                <input
                  autoFocus
                  value={event.label ?? ""}
                  onChange={(e) => setEvent({ ...event, label: e.target.value })}
                  placeholder="e.g. Hole in one"
                  maxLength={40}
                  className="h-11 w-full rounded-lg bg-sunken px-3.5 text-[15px] outline-none placeholder:text-ink-3"
                />
              </Field>
            )}
            <Field label="Headline">
              <input
                autoFocus={event.type !== "custom"}
                value={event.title}
                onChange={(e) => setEvent({ ...event, title: e.target.value })}
                placeholder={lifeEventHint(event.type)}
                maxLength={80}
                className="h-11 w-full rounded-lg bg-sunken px-3.5 text-[15px] outline-none placeholder:text-ink-3"
              />
            </Field>
            <Field label="When">
              <input
                type="date"
                value={event.date}
                onChange={(e) => setEvent({ ...event, date: e.target.value })}
                className="h-11 w-full rounded-lg bg-sunken px-3.5 text-[15px] text-ink outline-none"
              />
            </Field>
            {!photos.length && <NoPhotoHint subjectId={tagged[0]} />}
            <button
              onClick={() => setStep("write")}
              disabled={!eventReady}
              className="h-12 w-full rounded-full bg-ink text-[15px] font-semibold text-canvas disabled:opacity-25"
            >
              Done
            </button>
          </div>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet label={editing ? "Edit post" : "New post"} onClose={closeComposer} wide>
      <SheetHeader
        title={editing ? "Edit post" : "New post"}
        left={<TextButton onClick={closeComposer}>Cancel</TextButton>}
        right={
          <button
            onClick={submit}
            disabled={!canPost}
            className="h-8 rounded-full bg-ink px-4 text-[14px] font-semibold text-canvas disabled:opacity-25"
          >
            {sharing ? "Saving…" : uploading ? "Uploading…" : editing ? "Save" : "Share"}
          </button>
        }
      />

      <div className="min-h-0 flex-1 overflow-y-auto">
        {error && <p className="mx-4 mt-3 rounded-lg bg-sunken px-3.5 py-2.5 text-[14px] text-danger">{error}</p>}

        {event && (
          <button onClick={() => setStep("eventDetails")} className="block w-full px-4 pt-4 text-left">
            <EventPreview event={event} photo={cover} subjectId={tagged[0] ?? me} />
          </button>
        )}

        <div className="flex gap-3 px-4 pt-4">
          <Avatar personId={me} size={36} />
          <div className="min-w-0 flex-1 pt-1.5">
            <MentionInput
              value={text}
              onChange={setText}
              rows={4}
              autoFocus
              placeholder={event ? "Tell the story behind it" : "What's happening with the family?"}
              aria-label="Post text"
              className="text-[16px] leading-relaxed"
            />
          </div>
        </div>

        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
          {photos.map((p) => (
            <div key={p.key} className="relative h-28 w-24 shrink-0 overflow-hidden rounded-xl bg-sunken">
              <img
                src={p.preview.src}
                alt=""
                className={`h-full w-full object-cover ${p.mediaId ? "" : "opacity-50"}`}
              />
              {!p.mediaId && (
                <span className="absolute inset-x-1.5 bottom-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-center text-[11px] font-medium text-white">
                  {p.error ? "Didn't upload" : "Uploading…"}
                </span>
              )}
              <button
                onClick={() => setPhotos(photos.filter((x) => x.key !== p.key))}
                aria-label="Remove photo"
                title={p.error}
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
              accept="image/jpeg,image/png,image/gif,image/webp,image/heic,image/heif"
              multiple
              className="sr-only"
              onChange={(e) => {
                addFiles([...(e.target.files ?? [])]);
                e.target.value = "";
              }}
            />
          </label>
        </div>

        <ul className="mt-3 border-t border-line">
          <Row label="Tag family" onClick={() => setStep("tag")}>
            <TaggedSummary tagged={tagged} />
          </Row>
          <Row label="Life event" onClick={() => setStep(event ? "eventDetails" : "eventType")}>
            {event ? lifeEventLabel(event) : "None"}
          </Row>
        </ul>
        <p className="px-4 py-3 text-[12px] text-ink-3">Only people in {family.name} can see this.</p>
      </div>
    </Sheet>
  );
}

function TaggedSummary({ tagged }: { tagged: string[] }) {
  const { graph } = useFamily();
  if (!tagged.length) return <>None</>;
  return (
    <span className="flex items-center gap-2">
      <span className="flex -space-x-2">
        {tagged.slice(0, 4).map((id) => (
          <Avatar key={id} personId={id} size={24} className="ring-2 ring-surface" />
        ))}
      </span>
      {tagged.length === 1 ? graph.getPerson(tagged[0]).firstName : `${tagged.length} people`}
    </span>
  );
}

function NoPhotoHint({ subjectId }: { subjectId?: string }) {
  const { graph } = useFamily();
  const subject = graph.findPerson(subjectId);
  return (
    <p className="text-[13px] text-ink-3">
      No photo yet, so we&apos;ll use {subject ? `${subject.firstName}'s` : "your"} profile photo. Add one to
      the post to use it instead.
    </p>
  );
}

// What the post will look like: the headline set over the photo.
function EventPreview({
  event,
  photo,
  subjectId,
}: {
  event: LifeEvent;
  photo?: Photo;
  subjectId: string;
}) {
  const { graph } = useFamily();
  const src = photo?.src ?? graph.getPerson(subjectId).photo?.src;
  const date = new Date(`${event.date}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-[14px] bg-ink">
      {src && <img src={src} alt="" className="h-full w-full object-cover" />}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent px-5 pb-5 pt-20 text-white">
        <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-white/80">
          {lifeEventLabel(event)} · {date}
        </div>
        <div className="display mt-1.5 text-[28px] [text-wrap:balance]">
          {event.title.trim() || <span className="text-white/45">{lifeEventHint(event.type)}</span>}
        </div>
      </div>
    </div>
  );
}

function EventTypeList({
  selected,
  onPick,
}: {
  selected?: LifeEventType;
  // A custom pick carries whatever was typed into search as its name.
  onPick: (type: LifeEventType, label?: string) => void;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const groups = LIFE_EVENT_GROUPS.map((g) => ({
    name: g.name,
    events: (Object.entries(g.events) as [LifeEventType, { label: string }][]).filter(
      ([, e]) => !q || e.label.toLowerCase().includes(q),
    ),
  })).filter((g) => g.events.length);

  return (
    <>
      <div className="px-4 py-3">
        <label className="flex h-10 items-center gap-2 rounded-full bg-sunken px-3.5">
          <SearchIcon size={16} className="text-ink-3" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search events"
            className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-3"
          />
        </label>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto pb-4">
        {groups.map((g) => (
          <section key={g.name}>
            <h3 className="sticky top-0 bg-surface px-4 pb-1 pt-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-3">
              {g.name}
            </h3>
            <ul className="px-4">
              {g.events.map(([type, e]) => (
                <li key={type}>
                  <button
                    onClick={() => onPick(type)}
                    className="flex h-12 w-full items-center justify-between border-b border-line text-left text-[16px]"
                  >
                    {e.label}
                    {selected === type && <CheckIcon size={20} strokeWidth={2} />}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <section>
          <h3 className="px-4 pb-1 pt-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-3">
            Something else
          </h3>
          <ul className="px-4">
            <li>
              <button
                onClick={() => onPick("custom", query.trim() || undefined)}
                className="flex h-12 w-full items-center justify-between text-left text-[16px]"
              >
                {q ? `Name your own: “${query.trim()}”` : "Name your own event"}
                <ChevronRightIcon size={18} className="text-ink-3" />
              </button>
            </li>
          </ul>
        </section>
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-semibold">{label}</span>
      {children}
    </label>
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

// Everyone but you, with a search box.
export function TagList({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const { people, me } = useFamily();
  const [query, setQuery] = useState("");
  const list = people.filter(
    (p) => p.id !== me && fullName(p).toLowerCase().includes(query.toLowerCase()),
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
        {list.length === 0 && (
          <li className="px-4 py-10 text-center text-[14px] text-ink-3">
            {people.length <= 1 ? "Add family on the People page to tag them." : "No one by that name."}
          </li>
        )}
      </ul>
    </>
  );
}
