"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useSyncExternalStore } from "react";
import { createGraph, type FamilyGraph } from "./family";
import type { FamilySummary, Person, Relationship, Viewer } from "./types";

// The family being viewed, loaded once by its layout: who's in it and how they're related. People and
// links change rarely, so pages look them up here instead of fetching them again.

export type FamilyData = {
  family: FamilySummary;
  families: FamilySummary[];
  viewer: Viewer;
  people: Person[];
  relationships: Relationship[];
  unreadCount: number;
};

type Family = FamilyData & {
  graph: FamilyGraph;
  me: string;
  isAdmin: boolean;
  // A path inside this family: href("/tree") → "/f/{id}/tree"
  href: (path?: string) => string;
};

type Clock = { now: number; timeZone: string };

const FamilyContext = createContext<Family | null>(null);
const ClockContext = createContext<Clock | null>(null);

export function FamilyProvider({
  data,
  now: serverNow,
  timeZone,
  children,
}: {
  data: FamilyData;
  now: number;
  timeZone: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const base = `/f/${data.family.id}`;
  const value: Family = {
    ...data,
    graph: createGraph(data.people, data.relationships),
    me: data.viewer.profileId,
    isAdmin: data.viewer.role === "admin",
    href: (path = "") => `${base}${path}`,
  };

  // Server and browser render the same times at first; after that the clock ticks each minute.
  const now = useSyncExternalStore(subscribeMinutes, currentMinute, useCallback(() => serverNow, [serverNow]));

  // Tell the server our time zone for next time, and re-render if it guessed wrong.
  useEffect(() => {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (zone && zone !== timeZone) {
      document.cookie = `tz=${encodeURIComponent(zone)}; path=/; max-age=31536000; samesite=lax`;
      router.refresh();
    }
  }, [timeZone, router]);

  return (
    <FamilyContext value={value}>
      <ClockContext value={{ now, timeZone }}>{children}</ClockContext>
    </FamilyContext>
  );
}

let minute = Math.floor(Date.now() / 60000) * 60000;
const currentMinute = () => minute;

function subscribeMinutes(onChange: () => void) {
  const tick = () => {
    const next = Math.floor(Date.now() / 60000) * 60000;
    if (next !== minute) {
      minute = next;
      onChange();
    }
  };
  tick();
  const timer = setInterval(tick, 15_000);
  return () => clearInterval(timer);
}

export function useFamily() {
  const family = useContext(FamilyContext);
  if (!family) throw new Error("useFamily must be used inside FamilyProvider");
  return family;
}

export function useClock() {
  const clock = useContext(ClockContext);
  if (!clock) throw new Error("useClock must be used inside FamilyProvider");
  return clock;
}
