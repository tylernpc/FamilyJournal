import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { ComposerProvider } from "@/lib/composer";
import { FamilyProvider } from "@/lib/family-context";
import {
  getPeople,
  getRelationships,
  getTimeZone,
  getUnreadCount,
  requestTime,
  getViewer,
} from "@/lib/server/family";

type Props = { params: Promise<{ familyId: string }>; children: React.ReactNode };

export async function generateMetadata({ params }: Omit<Props, "children">): Promise<Metadata> {
  const { family } = await getViewer((await params).familyId);
  return { title: { default: family.name, template: `%s · ${family.name}` } };
}

export default async function FamilyLayout({ params, children }: Props) {
  const { familyId } = await params;
  const { viewer, family, families } = await getViewer(familyId);
  const [people, relationships, unreadCount, timeZone] = await Promise.all([
    getPeople(familyId),
    getRelationships(familyId),
    getUnreadCount(familyId),
    getTimeZone(),
  ]);

  return (
    <FamilyProvider
      data={{ family, families, viewer, people, relationships, unreadCount }}
      now={requestTime()}
      timeZone={timeZone}
    >
      <ComposerProvider>
        <AppShell>{children}</AppShell>
      </ComposerProvider>
    </FamilyProvider>
  );
}
