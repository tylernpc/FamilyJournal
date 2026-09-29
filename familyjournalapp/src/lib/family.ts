import { NOW, people, relationships } from "./data";
import type { Person, Photo, Post } from "./types";

const byId = new Map(people.map((p) => [p.id, p]));

export function getPerson(id: string): Person {
  const person = byId.get(id);
  if (!person) throw new Error(`Unknown person: ${id}`);
  return person;
}

export function findPerson(id: string): Person | undefined {
  return byId.get(id);
}

export const fullName = (p: Person) => `${p.firstName} ${p.lastName}`;

// Face-cropped portrait at the requested size (2x for sharp rendering).
export function photoUrl(p: Person, width: number, height = width) {
  if (!p.photo) return undefined;
  return `https://images.unsplash.com/${p.photo}?w=${width * 2}&h=${height * 2}&fit=crop&crop=faces&q=70`;
}

export const initials = (p: Person) => `${p.firstName[0]}${p.lastName[0]}`;

// ---------------------------------------------------------------------------
// Graph

export function parentsOf(id: string): string[] {
  return relationships
    .filter((r) => r.type === "parentOf" && r.to === id)
    .map((r) => r.from);
}

export function childrenOf(id: string): string[] {
  return relationships
    .filter((r) => r.type === "parentOf" && r.from === id)
    .map((r) => r.to);
}

export function spouseOf(id: string): string | undefined {
  const rel = relationships.find(
    (r) => r.type === "spouseOf" && (r.from === id || r.to === id),
  );
  if (!rel) return undefined;
  return rel.from === id ? rel.to : rel.from;
}

export function siblingsOf(id: string): string[] {
  const parents = parentsOf(id);
  const sibs = new Set<string>();
  for (const parent of parents) {
    for (const child of childrenOf(parent)) if (child !== id) sibs.add(child);
  }
  return [...sibs];
}

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

// ---------------------------------------------------------------------------
// Kinship: "what is `other` to `self`" — e.g. kinship("emma", "june") => "Grandmother"

const gendered = (p: Person, f: string, m: string, n: string) =>
  p.sex === "f" ? f : p.sex === "m" ? m : n;

const ordinal = ["", "First", "Second", "Third", "Fourth"];
const removed = ["", "once removed", "twice removed", "three times removed"];

function greats(n: number) {
  if (n <= 0) return "";
  if (n === 1) return "Great-";
  return `${n}× great-`;
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

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function kinship(selfId: string, otherId: string): string {
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

// ---------------------------------------------------------------------------
// Dates

export function lifespan(p: Person): string | undefined {
  const born = p.birthDate?.slice(0, 4);
  const died = p.deathDate?.slice(0, 4);
  if (born && died) return `${born}–${died}`;
  if (born) return `b. ${born}`;
  return undefined;
}

export function age(p: Person): number | undefined {
  if (!p.birthDate) return undefined;
  const end = p.deathDate ? new Date(p.deathDate) : NOW;
  const birth = new Date(p.birthDate);
  let years = end.getFullYear() - birth.getFullYear();
  const m = end.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && end.getDate() < birth.getDate())) years--;
  return years;
}

const monthDay = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "America/Denver",
});
const monthDayYear = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});
const timeOfDay = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/Denver",
});

export function relativeTime(iso: string): string {
  const then = new Date(iso);
  const diffMin = Math.round((NOW.getTime() - then.getTime()) / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  const diffD = Math.round(diffH / 24);
  if (diffD === 1) return `Yesterday at ${timeOfDay.format(then)}`;
  if (diffD < 7) return `${diffD}d`;
  const sameYear = then.getFullYear() === NOW.getFullYear();
  return sameYear
    ? monthDay.format(then)
    : `${monthDay.format(then)}, ${then.getFullYear()}`;
}

export function longDate(isoDate: string): string {
  return monthDayYear.format(new Date(`${isoDate.slice(0, 10)}T00:00:00Z`));
}

export function isRecent(iso: string, days = 7) {
  return NOW.getTime() - new Date(iso).getTime() < days * 86400000;
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

// Life events always get the text-over-photo treatment. Without a photo of their own,
// they use the portrait of the person the event is about.
export function eventCover(post: Post): Photo | undefined {
  if (!post.lifeEvent) return undefined;
  if (post.photos?.length) return post.photos[0];
  const subject = getPerson(post.tagged[0] ?? post.authorId);
  const src = photoUrl(subject, 600, 450);
  return src ? { src, alt: fullName(subject), width: 1200, height: 900 } : undefined;
}

export function sharedPosts(posts: Post[], a: string, b: string) {
  return posts.filter((p) => postInvolves(p, a) && postInvolves(p, b));
}
