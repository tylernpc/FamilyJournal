import type { Metadata } from "next";
import { TreeView } from "@/components/tree-view";
import { toFeedPage } from "@/lib/api/map";
import { api, isGuid, load } from "@/lib/server/api";

export const metadata: Metadata = { title: "Family tree" };

export default async function TreePage({
  params,
  searchParams,
}: {
  params: Promise<{ familyId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { familyId } = await params;
  const query = await searchParams;
  const person = isGuid(query.person) ? query.person : undefined;
  const between = isGuid(query.with) ? query.with : undefined;

  // The threads between people come from recent posts
  const { posts } = toFeedPage(
    await load(api.GET("/api/families/{familyId}/posts", { params: { path: { familyId }, query: { limit: 50 } } })),
  );

  // Keyed so navigating between deep links resets the selection.
  return <TreeView key={`${person}-${between}`} posts={posts} initialPerson={person} initialBetween={between} />;
}
