import { Feed } from "@/components/feed";
import { toFeedPage } from "@/lib/api/map";
import { api, isGuid, load } from "@/lib/server/api";

export default async function JournalPage({
  params,
  searchParams,
}: {
  params: Promise<{ familyId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { familyId } = await params;
  const person = (await searchParams).person;
  const profileId = isGuid(person) ? person : undefined;

  const page = toFeedPage(
    await load(
      api.GET("/api/families/{familyId}/posts", {
        params: { path: { familyId }, query: { profileId, limit: 20 } },
      }),
    ),
  );

  // Keyed so switching the person filter starts a fresh list.
  return <Feed key={profileId ?? "all"} initial={page} personFilter={profileId} />;
}
