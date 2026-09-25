import type { Metadata } from "next";
import { TreeView } from "@/components/tree-view";
import { findPerson } from "@/lib/family";

export const metadata: Metadata = { title: "Family tree" };

export default async function TreePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const valid = (v: unknown) => (typeof v === "string" && findPerson(v) ? v : undefined);
  const person = valid(params.person);
  const between = valid(params.with);
  // Keyed so navigating between deep links resets the selection.
  return (
    <TreeView
      key={`${person}-${between}`}
      initialPerson={person}
      initialBetween={between}
    />
  );
}
