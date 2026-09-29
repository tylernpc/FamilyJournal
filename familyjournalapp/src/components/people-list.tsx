"use client";

import { useState } from "react";
import { fullName, lifespan } from "@/lib/family";
import { useFamily } from "@/lib/family-context";
import type { Person } from "@/lib/types";
import { CloseIcon, PlusIcon, SearchIcon } from "./icons";
import { InviteSheet, PersonSheet } from "./person-sheets";
import { PortraitCard } from "./portrait-card";

type Filter = "all" | "joined" | "notJoined";

export function PeopleList() {
  const { family, people, me, graph } = useFamily();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sheet, setSheet] = useState<"invite" | "add" | null>(null);

  const caption = (p: Person) => {
    if (p.id === me) return "You";
    const relation = graph.kinship(me, p.id);
    if (p.lifeStatus === "deceased") return [relation, lifespan(p)].filter(Boolean).join(" · ");
    if (p.isPlaceholder && p.inviteSentAt) return `${relation} · Invited`;
    return relation;
  };

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
        <div className="min-w-0">
          <h1 className="display text-[40px]">People</h1>
          <p className="mt-1.5 text-[14px] text-ink-3">
            {counts.all} in {family.name}, {counts.joined} on Family Journal
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => setSheet("add")}
            aria-label="Add someone"
            className="flex h-10 items-center gap-1.5 rounded-full border border-ink px-4 text-[14px] font-semibold hover:bg-hover"
          >
            <PlusIcon size={18} strokeWidth={2} />
            <span className="hidden sm:inline">Add someone</span>
          </button>
          <button
            onClick={() => setSheet("invite")}
            className="h-10 rounded-full bg-ink px-5 text-[14px] font-semibold text-canvas hover:bg-accent-hover"
          >
            Invite
          </button>
        </div>
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
      {list.length === 0 &&
        (query ? (
          <p className="py-16 text-center text-[15px] text-ink-3">No one called “{query}”.</p>
        ) : (
          <p className="py-16 text-center text-[15px] text-ink-3">No one here yet.</p>
        ))}
      {people.length === 1 && !query && (
        <div className="mt-10 rounded-xl bg-sunken px-5 py-6 text-center">
          <p className="display text-[24px]">Start the tree</p>
          <p className="mx-auto mt-2 max-w-[380px] text-[15px] text-ink-2">
            Add your parents, grandparents, anyone. They don&apos;t need an account to be in the tree, and you can
            invite them whenever you like.
          </p>
          <button
            onClick={() => setSheet("add")}
            className="mt-4 h-10 rounded-full bg-ink px-5 text-[14px] font-semibold text-canvas hover:bg-accent-hover"
          >
            Add someone
          </button>
        </div>
      )}

      {sheet === "invite" && <InviteSheet onClose={() => setSheet(null)} />}
      {sheet === "add" && <PersonSheet onClose={() => setSheet(null)} />}
    </div>
  );
}
