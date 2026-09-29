import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProfileView } from "@/components/profile-view";
import { toFeedPage } from "@/lib/api/map";
import { fullName } from "@/lib/family";
import { api, isGuid, load } from "@/lib/server/api";
import { getPeople } from "@/lib/server/family";

type Props = { params: Promise<{ familyId: string; profileId: string }> };

async function findPerson({ params }: Props) {
  const { familyId, profileId } = await params;
  if (!isGuid(profileId)) notFound();
  const person = (await getPeople(familyId)).find((p) => p.id === profileId);
  if (!person) notFound();
  return { familyId, person };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { person } = await findPerson(props);
  return { title: fullName(person) };
}

export default async function PersonPage(props: Props) {
  const { familyId, person } = await findPerson(props);
  // Everything they wrote or are tagged in, for Moments and the timeline
  const { posts } = toFeedPage(
    await load(
      api.GET("/api/families/{familyId}/posts", {
        params: { path: { familyId }, query: { profileId: person.id, limit: 50 } },
      }),
    ),
  );

  return <ProfileView key={person.id} id={person.id} posts={posts} />;
}
