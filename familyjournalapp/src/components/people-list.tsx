"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { CURRENT_USER_ID, people } from "@/lib/data";
import { age, fullName, kinship, lifespan, longDate } from "@/lib/family";
import type { Person } from "@/lib/types";
import { useDismiss } from "@/lib/use-dismiss";
import { Avatar } from "./avatar";
import { CheckIcon, CloseIcon, LinkIcon, PlusIcon, SearchIcon } from "./icons";

type Filter = "all" | "joined" | "notJoined";

function status(p: Person): { label: string; tone: "ok" | "muted" | "pending" } {
  if (p.lifeStatus === "deceased") return { label: "In memory", tone: "muted" };
  if (!p.isPlaceholder)
    return { label: `Joined ${longDate(p.joinedAt!).replace(/ \d+,/, "")}`, tone: "ok" };
  if (p.inviteSentAt) return { label: "Invited", tone: "pending" };
  if ((age(p) ?? 99) < 13) return { label: "Managed profile", tone: "muted" };
  return { label: "Not invited", tone: "muted" };
}

export function PeopleList() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [inviting, setInviting] = useState(false);

  const list = people
    .filter((p) => fullName(p).toLowerCase().includes(query.toLowerCase()) || p.maidenName?.toLowerCase().includes(query.toLowerCase()))
    .filter((p) =>
      filter === "all" ? true : filter === "joined" ? !p.isPlaceholder : p.isPlaceholder,
    );

  const counts = {
    all: people.length,
    joined: people.filter((p) => !p.isPlaceholder).length,
    notJoined: people.filter((p) => p.isPlaceholder).length,
  };

  return (
    <div className="mx-auto w-full max-w-[880px] py-6 sm:px-6 sm:py-10">
      <div className="flex items-end justify-between gap-4 px-4 sm:px-0">
        <div>
          <h1 className="font-serif text-[30px] leading-tight">People</h1>
          <p className="mt-1 text-[14px] text-ink-3">
            Everyone in the Harlow family, whether they&apos;re on Family Journal or not.
          </p>
        </div>
        <button
          onClick={() => setInviting(true)}
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-md bg-accent px-3.5 text-[14px] font-medium text-white hover:bg-accent-hover dark:text-[#10180f]"
        >
          <PlusIcon size={16} />
          Invite
        </button>
      </div>

      <div className="mt-6 flex flex-col gap-3 px-4 sm:flex-row sm:items-center sm:px-0">
        <label className="flex h-9 flex-1 items-center gap-2 rounded-md border border-line bg-surface px-3 focus-within:border-line-strong">
          <SearchIcon size={16} className="text-ink-3" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name"
            className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-ink-3"
          />
        </label>
        <div className="flex rounded-md border border-line bg-surface p-0.5 text-[13px]">
          {(
            [
              ["all", "All"],
              ["joined", "Joined"],
              ["notJoined", "Not joined"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              aria-pressed={filter === key}
              className={`h-7 rounded px-2.5 ${
                filter === key ? "bg-sunken font-medium text-ink" : "text-ink-2 hover:text-ink"
              }`}
            >
              {label} <span className="tabular-nums text-ink-3">{counts[key]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 overflow-hidden border-y border-line bg-surface sm:rounded-lg sm:border-x">
        <div className="hidden grid-cols-[minmax(0,1fr)_170px_150px] gap-4 border-b border-line px-4 py-2 text-[12px] font-medium text-ink-3 sm:grid">
          <span>Name</span>
          <span>Relationship to you</span>
          <span>Status</span>
        </div>
        <ul className="divide-y divide-line">
          {list.map((p) => {
            const s = status(p);
            return (
              <li key={p.id}>
                <Link
                  href={`/people/${p.id}`}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 hover:bg-hover sm:grid-cols-[minmax(0,1fr)_170px_150px]"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <Avatar personId={p.id} size={36} />
                    <span className="min-w-0 leading-tight">
                      <span className="block truncate text-[14px] font-medium">
                        {fullName(p)}
                        {p.role === "admin" && (
                          <span className="ml-2 rounded border border-line px-1.5 py-px text-[11px] font-medium text-ink-2">
                            Admin
                          </span>
                        )}
                      </span>
                      <span className="text-[12px] text-ink-3">
                        {[p.maidenName && `née ${p.maidenName}`, lifespan(p)].filter(Boolean).join(" · ")}
                        <span className="sm:hidden"> · {p.id === CURRENT_USER_ID ? "You" : kinship(CURRENT_USER_ID, p.id)}</span>
                      </span>
                    </span>
                  </span>
                  <span className="hidden truncate text-[14px] text-ink-2 sm:block">
                    {p.id === CURRENT_USER_ID ? "You" : kinship(CURRENT_USER_ID, p.id)}
                  </span>
                  <span className="flex items-center gap-2 text-[13px] text-ink-2">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        s.tone === "ok" ? "bg-accent" : s.tone === "pending" ? "bg-[var(--ev-job)]" : "bg-line-strong"
                      }`}
                    />
                    {s.label}
                  </span>
                </Link>
              </li>
            );
          })}
          {list.length === 0 && (
            <li className="px-4 py-10 text-center text-[14px] text-ink-3">No one matches “{query}”.</li>
          )}
        </ul>
      </div>

      {inviting && <InviteDialog onClose={() => setInviting(false)} />}
    </div>
  );
}

function InviteDialog({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(ref, true, onClose);
  const [copied, setCopied] = useState(false);
  const [contact, setContact] = useState("");
  const [claim, setClaim] = useState("");
  const [sent, setSent] = useState(false);
  const claimable = people.filter(
    (p) => p.isPlaceholder && p.lifeStatus === "living" && (age(p) ?? 99) >= 13,
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 sm:items-center">
      <div
        ref={ref}
        role="dialog"
        aria-labelledby="invite-title"
        className="w-full max-w-md rounded-t-xl bg-surface shadow-pop sm:rounded-xl"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 id="invite-title" className="text-[16px] font-semibold">
            Invite to the Harlow family
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="-mr-1.5 rounded-md p-1.5 text-ink-3 hover:bg-hover hover:text-ink"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        {sent ? (
          <div className="px-5 py-8 text-center">
            <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent-ink">
              <CheckIcon size={20} />
            </span>
            <p className="mt-3 font-medium">Invite sent to {contact}</p>
            <p className="mt-1 text-[14px] text-ink-3">
              {claim
                ? "When they accept, they'll be asked to confirm the existing profile is theirs."
                : "When they accept, they'll set up their own profile."}
            </p>
            <button
              onClick={onClose}
              className="mt-5 h-9 rounded-md border border-line px-4 text-[14px] hover:bg-hover"
            >
              Done
            </button>
          </div>
        ) : (
          <form
            className="space-y-4 px-5 py-5"
            onSubmit={(e) => {
              e.preventDefault();
              if (contact.trim()) setSent(true);
            }}
          >
            <label className="block">
              <span className="text-[13px] font-medium text-ink-2">Email or phone number</span>
              <input
                autoFocus
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="grandma.june@example.com"
                className="mt-1.5 h-9 w-full rounded-md border border-line bg-canvas px-3 text-[14px] outline-none placeholder:text-ink-3 focus:border-line-strong"
              />
            </label>
            <label className="block">
              <span className="text-[13px] font-medium text-ink-2">Are they already in the tree?</span>
              <select
                value={claim}
                onChange={(e) => setClaim(e.target.value)}
                className="mt-1.5 h-9 w-full rounded-md border border-line bg-canvas px-2.5 text-[14px] outline-none focus:border-line-strong"
              >
                <option value="">No, they&apos;ll create a new profile</option>
                {claimable.map((p) => (
                  <option key={p.id} value={p.id}>
                    Yes, they&apos;re {fullName(p)}
                  </option>
                ))}
              </select>
              <span className="mt-1.5 block text-[12px] leading-relaxed text-ink-3">
                Linking an existing profile keeps every post they&apos;ve already been tagged in.
              </span>
            </label>

            <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText("https://familyjournal.app/join/harlow-7Q2X");
                  setCopied(true);
                }}
                className="flex h-9 items-center gap-1.5 rounded-md px-2 text-[14px] text-ink-2 hover:bg-hover"
              >
                {copied ? <CheckIcon size={16} className="text-accent" /> : <LinkIcon size={16} />}
                {copied ? "Link copied" : "Copy invite link"}
              </button>
              <button
                type="submit"
                disabled={!contact.trim()}
                className="h-9 rounded-md bg-accent px-4 text-[14px] font-medium text-white hover:bg-accent-hover disabled:opacity-40 dark:text-[#10180f]"
              >
                Send invite
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
