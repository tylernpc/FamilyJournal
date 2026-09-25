import { Feed } from "@/components/feed";
import { findPerson } from "@/lib/family";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const person = typeof params.person === "string" && findPerson(params.person) ? params.person : undefined;
  const tags =
    typeof params.with === "string" ? params.with.split(",").filter((id) => findPerson(id)) : [];

  return <Feed personFilter={person} initialTags={tags} />;
}
