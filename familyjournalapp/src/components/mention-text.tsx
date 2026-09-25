import Link from "next/link";
import { people } from "@/lib/data";
import { fullName } from "@/lib/family";

const names = people
  .map((p) => ({ id: p.id, name: fullName(p) }))
  .sort((a, b) => b.name.length - a.name.length);

const pattern = new RegExp(
  `@(${names.map((n) => n.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
  "g",
);

export function MentionText({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const person = names.find((n) => n.name === match[1])!;
    parts.push(text.slice(last, match.index));
    parts.push(
      <Link
        key={match.index}
        href={`/people/${person.id}`}
        className="font-semibold hover:underline"
      >
        {person.name}
      </Link>,
    );
    last = match.index + match[0].length;
  }
  parts.push(text.slice(last));
  return <>{parts}</>;
}
