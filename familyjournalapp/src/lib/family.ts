import type { Person, Photo, Post, Relationship } from "./types";

export const fullName = (p: Person) => `${p.firstName} ${p.lastName}`.trim();

export const initials = (p: Person) => `${p.firstName[0] ?? ""}${p.lastName[0] ?? ""}`;

// Someone a post or notification refers to who isn't in the list anymore.
const unknownPerson = (id: string): Person => ({
  id,
  firstName: "Someone",
  lastName: "",
  gender: "unspecified",
  lifeStatus: "living",
  isPlaceholder: true,
  canEdit: false,
});

// ---------------------------------------------------------------------------
// Graph: who's related to whom, built from the family's people and relationship links.

export type FamilyGraph = ReturnType<typeof createGraph>;

export function createGraph(people: Person[], relationships: Relationship[]) {
  const byId = new Map(people.map((p) => [p.id, p]));

  const getPerson = (id: string): Person => byId.get(id) ?? unknownPerson(id);
  const findPerson = (id: string | undefined) => (id ? byId.get(id) : undefined);

  const parentsOf = (id: string) =>
    relationships.filter((r) => r.type === "parentOf" && r.to === id).map((r) => r.from);

  const childrenOf = (id: string) =>
    relationships.filter((r) => r.type === "parentOf" && r.from === id).map((r) => r.to);

  const marriageOf = (id: string) =>
    relationships.find((r) => r.type === "spouseOf" && (r.from === id || r.to === id));

  const spouseOf = (id: string) => {
    const rel = marriageOf(id);
    if (!rel) return undefined;
    return rel.from === id ? rel.to : rel.from;
  };

  const siblingsOf = (id: string) => {
    const sibs = new Set<string>();
    for (const parent of parentsOf(id)) {
      for (const child of childrenOf(parent)) if (child !== id) sibs.add(child);
    }
    return [...sibs];
  };

  function ancestorDepths(id: string): Map<string, number> {
    const depths = new Map<string, number>([[id, 0]]);
    const queue = [id];
    while (queue.length) {
      const current = queue.shift()!;
      for (const parent of parentsOf(current)) {
        if (!depths.has(parent)) {
          depths.set(parent, depths.get(current)! + 1);
          queue.push(parent);
        }
      }
    }
    return depths;
  }

  function bloodKinship(selfId: string, otherId: string): string | undefined {
    const a = ancestorDepths(selfId);
    const b = ancestorDepths(otherId);
    let best: { up: number; down: number } | undefined;
    for (const [ancestor, up] of a) {
      const down = b.get(ancestor);
      if (down === undefined) continue;
      if (!best || up + down < best.up + best.down) best = { up, down };
    }
    if (!best) return undefined;

    const other = getPerson(otherId);
    const { up, down } = best;

    if (up === 0 && down === 0) return "You";
    if (up === 0) {
      if (down === 1) return gendered(other, "Daughter", "Son", "Child");
      const base = gendered(other, "granddaughter", "grandson", "grandchild");
      return down === 2 ? capitalize(base) : `${greats(down - 2)}${base}`;
    }
    if (down === 0) {
      if (up === 1) return gendered(other, "Mother", "Father", "Parent");
      const base = gendered(other, "grandmother", "grandfather", "grandparent");
      return up === 2 ? capitalize(base) : `${greats(up - 2)}${base}`;
    }
    if (up === 1 && down === 1) return gendered(other, "Sister", "Brother", "Sibling");
    if (up === 1) {
      const base = gendered(other, "niece", "nephew", "nibling");
      return down === 2 ? capitalize(base) : `${greats(down - 2)}${base}`;
    }
    if (down === 1) {
      const base = gendered(other, "aunt", "uncle", "parent's sibling");
      return up === 2 ? capitalize(base) : `${greats(up - 2)}${base}`;
    }
    const degree = Math.min(up, down) - 1;
    const gap = Math.abs(up - down);
    return [`${ordinal[degree] ?? `${degree}th`} cousin`, removed[gap]]
      .filter(Boolean)
      .join(" ");
  }

  // "What is `other` to `self`": kinship(emma, june) => "Grandmother"
  function kinship(selfId: string, otherId: string): string {
    if (selfId === otherId) return "You";
    const other = getPerson(otherId);

    const blood = bloodKinship(selfId, otherId);
    if (blood) return blood;

    if (spouseOf(selfId) === otherId) return gendered(other, "Wife", "Husband", "Spouse");

    // Other married into self's blood family.
    const otherSpouse = spouseOf(otherId);
    if (otherSpouse) {
      const via = bloodKinship(selfId, otherSpouse);
      if (via) {
        if (via === "Son" || via === "Daughter" || via === "Child")
          return gendered(other, "Daughter-in-law", "Son-in-law", "Child-in-law");
        if (via === "Brother" || via === "Sister" || via === "Sibling")
          return gendered(other, "Sister-in-law", "Brother-in-law", "Sibling-in-law");
        if (/aunt|uncle/i.test(via)) {
          const word = gendered(other, "aunt", "uncle", "aunt/uncle");
          return via.replace(/aunt|uncle/i, (m) => (/[AU]/.test(m[0]) ? capitalize(word) : word));
        }
        if (/cousin/i.test(via)) {
          const cousin = via.replace(/ (once|twice|three times) removed$/, "");
          return `${cousin}'s ${gendered(other, "wife", "husband", "spouse")}`;
        }
        return `${via} by marriage`;
      }
    }

    // Self married into other's blood family.
    const selfSpouse = spouseOf(selfId);
    if (selfSpouse) {
      const via = bloodKinship(selfSpouse, otherId);
      if (via) {
        if (via === "You") return gendered(other, "Wife", "Husband", "Spouse");
        if (/^(Mother|Father|Parent)$/.test(via)) return `${via}-in-law`;
        if (/^(Sister|Brother|Sibling)$/.test(via)) return `${via}-in-law`;
        if (/grand(mother|father|parent)$/i.test(via)) return `${via}-in-law`;
        if (/child|son|daughter|niece|nephew/i.test(via)) return via;
        return `${via} by marriage`;
      }
    }

    return "Family";
  }

  // Life events always get the text-over-photo treatment. Without a photo of their own,
  // they use the portrait of the person the event is about.
  function eventCover(post: Post): Photo | undefined {
    if (!post.lifeEvent) return undefined;
    if (post.photos.length) return post.photos[0];
    return getPerson(post.tagged[0] ?? post.authorId).photo;
  }

  return {
    people,
    relationships,
    getPerson,
    findPerson,
    parentsOf,
    childrenOf,
    marriageOf,
    spouseOf,
    siblingsOf,
    kinship,
    eventCover,
  };
}

const gendered = (p: Person, f: string, m: string, n: string) =>
  p.sex === "f" ? f : p.sex === "m" ? m : n;

const ordinal = ["", "First", "Second", "Third", "Fourth"];
const removed = ["", "once removed", "twice removed", "three times removed"];

function greats(n: number) {
  if (n <= 0) return "";
  if (n === 1) return "Great-";
  return `${n}× great-`;
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ---------------------------------------------------------------------------
// Dates. `now` and the time zone come from useClock(), so the server and the browser agree.

export function lifespan(p: Person): string | undefined {
  const born = p.birthDate?.slice(0, 4);
  const died = p.deathDate?.slice(0, 4);
  if (born && died) return `${born}–${died}`;
  if (born) return `b. ${born}`;
  if (died) return `d. ${died}`;
  return undefined;
}

export function age(p: Person, now: number): number | undefined {
  if (!p.birthDate) return undefined;
  const end = p.deathDate ? new Date(`${p.deathDate}T00:00:00Z`) : new Date(now);
  const birth = new Date(`${p.birthDate}T00:00:00Z`);
  let years = end.getUTCFullYear() - birth.getUTCFullYear();
  const m = end.getUTCMonth() - birth.getUTCMonth();
  if (m < 0 || (m === 0 && end.getUTCDate() < birth.getUTCDate())) years--;
  return years;
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function format(date: Date, timeZone: string, options: Intl.DateTimeFormatOptions) {
  const key = `${timeZone}|${JSON.stringify(options)}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", { ...options, timeZone });
    formatters.set(key, formatter);
  }
  return formatter.format(date);
}

export function relativeTime(iso: string, now: number, timeZone: string): string {
  const then = new Date(iso);
  const diffMin = Math.round((now - then.getTime()) / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  const diffD = Math.round(diffH / 24);
  if (diffD === 1) return `Yesterday at ${format(then, timeZone, { hour: "numeric", minute: "2-digit" })}`;
  if (diffD < 7) return `${diffD}d`;
  const year = (d: Date) => format(d, timeZone, { year: "numeric" });
  const day = format(then, timeZone, { month: "short", day: "numeric" });
  return year(then) === year(new Date(now)) ? day : `${day}, ${year(then)}`;
}

// A calendar date ("2026-09-21") as "September 21, 2026".
export function longDate(isoDate: string): string {
  return format(new Date(`${isoDate.slice(0, 10)}T00:00:00Z`), "UTC", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// Today's date where the viewer is, as "YYYY-MM-DD".
export function localDate(now: number, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date(now));
}

export function isRecent(iso: string, now: number, days = 7) {
  return now - new Date(iso).getTime() < days * 86400000;
}

// ---------------------------------------------------------------------------
// Posts ↔ people

export function postInvolves(post: Post, personId: string) {
  return post.authorId === personId || post.tagged.includes(personId);
}

export function peopleInPost(post: Post): string[] {
  return [...new Set([post.authorId, ...post.tagged])];
}

// Who shows up alongside `personId` in posts, most frequent first.
export function companions(posts: Post[], personId: string) {
  const counts = new Map<string, number>();
  for (const post of posts) {
    if (!postInvolves(post, personId)) continue;
    for (const other of peopleInPost(post)) {
      if (other === personId) continue;
      counts.set(other, (counts.get(other) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id, count]) => ({ id, count }));
}

export function sharedPosts(posts: Post[], a: string, b: string) {
  return posts.filter((p) => postInvolves(p, a) && postInvolves(p, b));
}

// "Harlow Family" → "Harlow", for the header.
export function shortFamilyName(name: string) {
  const short = name
    .replace(/^the\s+/i, "")
    .replace(/\s+family$/i, "")
    .trim();
  return short || name;
}

// Names written as "@Full Name" in post and comment text, as profile ids.
export function mentionedIds(text: string, people: Person[]) {
  return people.filter((p) => text.includes(`@${fullName(p)}`)).map((p) => p.id);
}
