import type { Metadata } from "next";
import { SettingsView } from "@/components/settings-view";
import { toInvite, toRole } from "@/lib/api/map";
import { api, load } from "@/lib/server/api";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage({ params }: { params: Promise<{ familyId: string }> }) {
  const { familyId } = await params;
  const path = { params: { path: { familyId } } };
  const [family, invites] = await Promise.all([
    load(api.GET("/api/families/{familyId}", path)),
    load(api.GET("/api/families/{familyId}/invites", path)),
  ]);

  return (
    <SettingsView
      members={family.members.map((m) => ({ profileId: m.profileId, role: toRole(m.role), joinedAt: m.joinedAt }))}
      invites={invites.map(toInvite)}
    />
  );
}
