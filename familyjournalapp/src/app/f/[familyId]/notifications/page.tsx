import type { Metadata } from "next";
import { NotificationList } from "@/components/notification-list";
import { toNotification } from "@/lib/api/map";
import { api, load } from "@/lib/server/api";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage({ params }: { params: Promise<{ familyId: string }> }) {
  const { familyId } = await params;
  const page = await load(
    api.GET("/api/families/{familyId}/notifications", { params: { path: { familyId }, query: { limit: 50 } } }),
  );

  return <NotificationList notifications={page.notifications.map(toNotification)} />;
}
