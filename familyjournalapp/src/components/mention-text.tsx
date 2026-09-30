"use client";

import Link from "next/link";
import { fullName } from "@/lib/family";
import { useFamily } from "@/lib/family-context";

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Post and comment text with "@Full Name" mentions linked to profiles.
export function MentionText({ text }: { text: string }) {
  const { people, href } = useFamily();
  const names = people
    .map((p) => ({ id: p.id, name: fullName(p) }))
    .sort((a, b) => b.name.length - a.name.length);
  if (!names.length || !text.includes("@")) return <>{text}</>;

  const pattern = new RegExp(`@(${names.map((n) => escape(n.name)).join("|")})`, "g");
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const person = names.find((n) => n.name === match[1])!;
    parts.push(text.slice(last, match.index));
    parts.push(
      <Link key={match.index} href={href(`/people/${person.id}`)} className="font-semibold hover:underline">
        {person.name}
      </Link>,
    );
    last = match.index + match[0].length;
  }
  parts.push(text.slice(last));
  return <>{parts}</>;
}
