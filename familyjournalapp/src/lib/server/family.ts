import "server-only";

import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { cache } from "react";
import { toPerson, toRelationship, toRole } from "../api/map";
import type { FamilySummary, Viewer } from "../types";
import { api, isGuid, load } from "./api";
import { TIMEZONE_COOKIE } from "./session-cookies";

// Loaders shared by layouts and pages. cache() dedupes them within one request, so a layout and the
// page under it can both ask for the same thing.

const path = (familyId: string) => ({ params: { path: { familyId } } });

export const getAccount = cache(() => load(api.GET("/api/auth/me")));

export const getPeople = cache(async (familyId: string) =>
  (await load(api.GET("/api/families/{familyId}/people", path(familyId)))).map(toPerson),
);

export const getRelationships = cache(async (familyId: string) =>
  (await load(api.GET("/api/families/{familyId}/relationships", path(familyId)))).map(toRelationship),
);

export const getUnreadCount = cache(async (familyId: string) => {
  const page = await load(
    api.GET("/api/families/{familyId}/notifications", {
      params: { path: { familyId }, query: { limit: 1 } },
    }),
  );
  return page.unreadCount;
});

// The signed-in person as a member of this family; not-found for anyone else.
export const getViewer = cache(async (familyId: string) => {
  if (!isGuid(familyId)) notFound();
  const account = await getAccount();
  const membership = account.families.find((f) => f.familyId === familyId);
  if (!membership) notFound();

  const viewer: Viewer = {
    userId: account.id,
    profileId: membership.profileId,
    role: toRole(membership.role),
    email: account.email,
  };
  const family: FamilySummary = { id: familyId, name: membership.familyName };
  const families: FamilySummary[] = account.families.map((f) => ({ id: f.familyId, name: f.familyName }));
  return { viewer, family, families };
});

// The visitor's time zone, which the browser reports in a cookie, so server-rendered times match theirs.
export async function getTimeZone() {
  const zone = (await cookies()).get(TIMEZONE_COOKIE)?.value;
  if (zone) {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: zone });
      return zone;
    } catch {
      // not a zone this runtime knows
    }
  }
  return "America/Denver";
}

// When this request started, so everything on the page measures "2h ago" from the same moment.
export const requestTime = cache(() => Date.now());
