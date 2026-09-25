"use client";

import { useState } from "react";
import { CURRENT_USER_ID, people } from "@/lib/data";
import { age, fullName, kinship, lifespan } from "@/lib/family";
import type { Person } from "@/lib/types";
import { CheckIcon, CloseIcon, LinkIcon, SearchIcon } from "./icons";
import { PortraitCard } from "./portrait-card";
import { Sheet, SheetHeader } from "./sheet";

type Filter = "all" | "joined" | "notJoined";

function caption(p: Person) {
  if (p.id === CURRENT_USER_ID) return "You";
  if (p.lifeStatus === "deceased") return `${kinship(CURRENT_USER_ID, p.id)} · ${lifespan(p)}`;
  if (p.isPlaceholder && p.inviteSentAt) return `${kinship(CURRENT_USER_ID, p.id)} · Invited`;
  return kinship(CURRENT_USER_ID, p.id);
}

export function PeopleList() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [inviting, setInviting] = useState(false);

  const q = query.toLowerCase();
  const list = people
    .filter((p) => fullName(p).toLowerCase().includes(q) || p.maidenName?.toLowerCase().includes(q))
    .filter((p) => (filter === "all" ? true : filter === "joined" ? !p.isPlaceholder : p.isPlaceholder));

  const counts: Record<Filter, number> = {
    all: people.length,
    joined: people.filter((p) => !p.isPlaceholder).length,
    notJoined: people.filter((p) => p.isPlaceholder).length,
  };

  return (
    <div className="mx-auto w-full max-w-[960px] px-4 pb-12 pt-6 lg:px-6 lg:pt-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="display text-[40px]">People</h1>
          <p className="mt-1.5 text-[14px] text-ink-3">
            {counts.all} Harlows, {counts.joined} on Family Journal
          </p>
        </div>
        <button
          onClick={() => setInviting(true)}
          className="h-10 shrink-0 rounded-full bg-ink px-5 text-[14px] font-semibold text-canvas hover:bg-accent-hover"
        >
          Invite
        </button>
      </div>

      <label className="mt-6 flex h-11 items-center gap-2.5 rounded-full bg-sunken px-4">
        <SearchIcon size={18} className="text-ink-3" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the family"
          className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-3"
        />
        {query && (
          <button onClick={() => setQuery("")} aria-label="Clear search" className="text-ink-3">
            <CloseIcon size={16} />
          </button>
        )}
      </label>

      <div className="mt-4 flex gap-6 border-b border-line" role="tablist">
        {(
          [
            ["all", "Everyone"],
            ["joined", "Joined"],
            ["notJoined", "Not yet"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={filter === key}
            onClick={() => setFilter(key)}
            className={`-mb-px border-b-2 py-2.5 text-[15px] ${
              filter === key ? "border-ink font-semibold" : "border-transparent text-ink-3"
            }`}
          >
            {label} <span className="text-ink-3">{counts[key]}</span>
          </button>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {list.map((p) => (
          <PortraitCard key={p.id} personId={p.id} width={200} caption={caption(p)} />
        ))}
      </div>
      {list.length === 0 && (
        <p className="py-16 text-center text-[15px] text-ink-3">No one called “{query}”.</p>
      )}

      {inviting && <InviteSheet onClose={() => setInviting(false)} />}
    </div>
  );
}

function InviteSheet({ onClose }: { onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const [contact, setContact] = useState("");
  const [claim, setClaim] = useState("");
  const [sent, setSent] = useState(false);
  const claimable = people.filter(
    (p) => p.isPlaceholder && p.lifeStatus === "living" && (age(p) ?? 99) >= 13,
  );

  return (
    <Sheet label="Invite family" onClose={onClose}>
      <SheetHeader
        title="Invite family"
        left={
          <button onClick={onClose} className="h-8 text-[15px]">
            {sent ? "Done" : "Cancel"}
          </button>
        }
      />
      {sent ? (
        <div className="px-6 py-10 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-ink text-canvas">
            <CheckIcon size={22} strokeWidth={2} />
          </span>
          <p className="display mt-4 text-[26px]">Invite sent</p>
          <p className="mt-2 text-[15px] text-ink-2">
            {claim
              ? "They'll be asked to confirm the profile that's already in the tree is theirs."
              : `We sent a link to ${contact}.`}
          </p>
        </div>
      ) : (
        <form
          className="space-y-5 overflow-y-auto px-4 pb-6 pt-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (contact.trim()) setSent(true);
          }}
        >
          <label className="block">
            <span className="text-[14px] font-semibold">Email or phone</span>
            <input
              autoFocus
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="june@example.com"
              className="mt-2 h-11 w-full rounded-lg bg-sunken px-3.5 text-[15px] outline-none placeholder:text-ink-3"
            />
          </label>

          <fieldset>
            <legend className="text-[14px] font-semibold">Already in the tree?</legend>
            <p className="mt-0.5 text-[13px] text-ink-3">
              Linking keeps every post they&apos;ve been tagged in.
            </p>
            <div className="mt-2 divide-y divide-line rounded-lg border border-line">
              {[{ id: "", label: "No, they'll start a new profile" }, ...claimable.map((p) => ({ id: p.id, label: `Yes, they're ${fullName(p)}` }))].map(
                (opt) => (
                  <label key={opt.id || "new"} className="flex h-12 cursor-pointer items-center gap-3 px-3.5 text-[15px]">
                    <input
                      type="radio"
                      name="claim"
                      checked={claim === opt.id}
                      onChange={() => setClaim(opt.id)}
                      className="h-4 w-4 accent-[var(--ink)]"
                    />
                    {opt.label}
                  </label>
                ),
              )}
            </div>
          </fieldset>

          <button
            type="submit"
            disabled={!contact.trim()}
            className="h-12 w-full rounded-full bg-ink text-[15px] font-semibold text-canvas disabled:opacity-25"
          >
            Send invite
          </button>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText("https://familyjournal.app/join/harlow-7Q2X");
              setCopied(true);
            }}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full border border-ink text-[15px] font-semibold"
          >
            {copied ? <CheckIcon size={18} strokeWidth={2} /> : <LinkIcon size={18} />}
            {copied ? "Link copied" : "Copy invite link"}
          </button>
        </form>
      )}
    </Sheet>
  );
}
