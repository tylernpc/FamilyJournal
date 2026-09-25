"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { CURRENT_USER_ID, people } from "@/lib/data";
import { fullName, getPerson, kinship, longDate, postInvolves } from "@/lib/family";
import { useStore } from "@/lib/store";
import { useDismiss } from "@/lib/use-dismiss";
import { Avatar } from "./avatar";
import { Composer } from "./composer";
import { CheckIcon, ChevronDownIcon, ChevronRightIcon } from "./icons";
import { PostCard } from "./post-card";

export function Feed({ personFilter, initialTags }: { personFilter?: string; initialTags: string[] }) {
  const { posts } = useStore();
  const [eventsOnly, setEventsOnly] = useState(false);

  const visible = posts.filter(
    (p) => (!personFilter || postInvolves(p, personFilter)) && (!eventsOnly || p.lifeEvent),
  );

  return (
    <div className="mx-auto flex w-full max-w-[1000px] gap-8 py-0 sm:px-6 sm:py-8">
      <div className="min-w-0 flex-1 space-y-3 sm:max-w-[600px]">
        <Composer key={initialTags.join(",")} initialTags={initialTags} />

        <div className="flex items-center gap-2 px-4 pt-3 sm:px-0">
          <PersonFilter value={personFilter} />
          <div className="ml-auto flex rounded-md border border-line bg-surface p-0.5 text-[13px]">
            {[
              { label: "All posts", value: false },
              { label: "Life events", value: true },
            ].map((opt) => (
              <button
                key={opt.label}
                onClick={() => setEventsOnly(opt.value)}
                aria-pressed={eventsOnly === opt.value}
                className={`h-7 rounded px-2.5 ${
                  eventsOnly === opt.value ? "bg-sunken font-medium text-ink" : "text-ink-2 hover:text-ink"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {visible.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}

        {visible.length === 0 && (
          <div className="border-y border-line bg-surface px-6 py-12 text-center sm:rounded-lg sm:border-x">
            <p className="font-medium">Nothing here yet</p>
            <p className="mt-1 text-[14px] text-ink-3">
              {personFilter
                ? `No posts with ${getPerson(personFilter).firstName}${eventsOnly ? " marked as life events" : ""}.`
                : "No life events have been posted."}
            </p>
          </div>
        )}

        {visible.length > 0 && (
          <p className="py-6 text-center text-[13px] text-ink-3">
            You&apos;re all caught up. The family started journaling on November 2, 2025.
          </p>
        )}
      </div>

      <aside className="hidden w-[300px] shrink-0 space-y-4 xl:block">
        <FamilyRail />
      </aside>
    </div>
  );
}

function PersonFilter({ value }: { value?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(ref, open, () => setOpen(false));

  const go = (id?: string) => {
    setOpen(false);
    router.push(id ? `/?person=${id}` : "/", { scroll: false });
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex h-8 items-center gap-2 rounded-md border border-line bg-surface pl-1.5 pr-2 text-[13px] hover:border-line-strong"
      >
        {value ? <Avatar personId={value} size={20} /> : <span className="w-1" />}
        <span className="text-ink-3">Showing</span>
        <span className="font-medium">{value ? fullName(getPerson(value)) : "Everyone"}</span>
        <ChevronDownIcon size={16} className="text-ink-3" />
      </button>
      {open && (
        <ul className="absolute left-0 top-full z-30 mt-1 max-h-80 w-64 overflow-y-auto rounded-lg border border-line bg-surface py-1 shadow-pop">
          <li>
            <button
              onClick={() => go()}
              className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-[14px] hover:bg-hover"
            >
              <span className="flex-1">Everyone</span>
              {!value && <CheckIcon size={16} className="text-accent" />}
            </button>
          </li>
          <li className="my-1 border-t border-line" />
          {people.map((p) => (
            <li key={p.id}>
              <button
                onClick={() => go(p.id)}
                className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-[14px] hover:bg-hover"
              >
                <Avatar personId={p.id} size={24} />
                <span className="flex-1">
                  {p.id === CURRENT_USER_ID ? "You" : fullName(p)}
                </span>
                {value === p.id && <CheckIcon size={16} className="text-accent" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FamilyRail() {
  const members = people.filter((p) => !p.isPlaceholder);
  const waiting = people.filter((p) => p.isPlaceholder && p.inviteSentAt);
  const newest = [...people]
    .filter((p) => p.birthDate)
    .sort((a, b) => b.birthDate!.localeCompare(a.birthDate!))[0];

  return (
    <>
      <section className="rounded-lg border border-line bg-surface">
        <div className="px-4 pb-3 pt-4">
          <h2 className="font-serif text-[19px] leading-tight">The Harlows</h2>
          <p className="mt-1 text-[13px] text-ink-3">
            Four generations, from Walter &amp; June to {newest.firstName}.
          </p>
        </div>
        <dl className="grid grid-cols-3 border-t border-line text-center">
          {[
            [people.length, "People"],
            [4, "Generations"],
            [members.length, "Joined"],
          ].map(([n, label]) => (
            <div key={label} className="border-r border-line py-3 last:border-r-0">
              <dd className="text-[17px] font-semibold tabular-nums">{n}</dd>
              <dt className="text-[12px] text-ink-3">{label}</dt>
            </div>
          ))}
        </dl>
        <Link
          href="/tree"
          className="flex items-center justify-between border-t border-line px-4 py-2.5 text-[14px] font-medium text-accent-ink hover:bg-hover"
        >
          Open family tree
          <ChevronRightIcon size={16} />
        </Link>
      </section>

      {waiting.length > 0 && (
        <section className="rounded-lg border border-line bg-surface p-4">
          <h2 className="text-[13px] font-semibold text-ink-2">Invited, not joined yet</h2>
          <ul className="mt-3 space-y-3">
            {waiting.map((p) => (
              <li key={p.id} className="flex items-center gap-3">
                <Avatar personId={p.id} size={36} />
                <div className="min-w-0 flex-1 leading-tight">
                  <Link href={`/people/${p.id}`} className="text-[14px] font-medium hover:underline">
                    {fullName(p)}
                  </Link>
                  <div className="text-[12px] text-ink-3">
                    {kinship(CURRENT_USER_ID, p.id)} · sent {longDate(p.inviteSentAt!).replace(/, \d{4}$/, "")}
                  </div>
                </div>
                <button className="h-7 rounded-md border border-line px-2.5 text-[13px] hover:bg-hover">
                  Resend
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-lg border border-line bg-surface p-4">
        <h2 className="text-[13px] font-semibold text-ink-2">Newest in the tree</h2>
        <Link href={`/people/${newest.id}`} className="mt-3 flex items-center gap-3">
          <Avatar personId={newest.id} size={36} />
          <div className="leading-tight">
            <div className="text-[14px] font-medium hover:underline">{fullName(newest)}</div>
            <div className="text-[12px] text-ink-3">
              Born {longDate(newest.birthDate!)} · added by{" "}
              {newest.addedBy ? getPerson(newest.addedBy).firstName : "family"}
            </div>
          </div>
        </Link>
      </section>

      <p className="px-1 text-[12px] leading-relaxed text-ink-3">
        Only people in the Harlow family can see what&apos;s shared here.
      </p>
    </>
  );
}
