"use client";

import Link from "next/link";
import { fullName, getPerson, relativeTime } from "@/lib/family";
import { useStore } from "@/lib/store";
import type { AppNotification } from "@/lib/types";
import { Avatar } from "./avatar";
import { CommentIcon, FeedIcon, PeopleIcon, TagIcon, ThumbIcon } from "./icons";

const COPY: Record<AppNotification["type"], { verb: string; icon: typeof FeedIcon }> = {
  postCreated: { verb: "shared a new post", icon: FeedIcon },
  commentAdded: { verb: "commented on your post", icon: CommentIcon },
  reactionAdded: { verb: "reacted to your post", icon: ThumbIcon },
  memberJoined: { verb: "joined the Harlow family", icon: PeopleIcon },
  memberTagged: { verb: "tagged you in a post", icon: TagIcon },
};

export function NotificationList() {
  const { notifications, unreadCount, markAllRead } = useStore();
  const fresh = notifications.filter((n) => !n.read);
  const earlier = notifications.filter((n) => n.read);

  return (
    <div className="mx-auto w-full max-w-[640px] py-6 sm:px-6 sm:py-10">
      <div className="flex items-end justify-between px-4 sm:px-0">
        <h1 className="font-serif text-[30px] leading-tight">Notifications</h1>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="h-8 rounded-md px-2.5 text-[13px] font-medium text-accent-ink hover:bg-hover"
          >
            Mark all as read
          </button>
        )}
      </div>

      {fresh.length > 0 && <Group title="New" items={fresh} />}
      <Group title={fresh.length ? "Earlier" : "All caught up"} items={earlier} />
    </div>
  );
}

function Group({ title, items }: { title: string; items: AppNotification[] }) {
  if (!items.length) return null;
  return (
    <section className="mt-6">
      <h2 className="px-4 text-[13px] font-semibold text-ink-2 sm:px-0">{title}</h2>
      <ul className="mt-2 overflow-hidden border-y border-line bg-surface sm:rounded-lg sm:border-x">
        {items.map((n) => {
          const { verb, icon: Icon } = COPY[n.type];
          const actor = getPerson(n.actorId);
          const href = n.postId ? `/?person=${n.actorId}` : `/people/${n.actorId}`;
          return (
            <li key={n.id} className="border-b border-line last:border-b-0">
              <Link
                href={href}
                className={`flex gap-3 px-4 py-3.5 hover:bg-hover ${n.read ? "" : "bg-accent-soft/40"}`}
              >
                <span className="relative shrink-0">
                  <Avatar personId={n.actorId} size={40} />
                  <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-surface bg-sunken text-ink-2">
                    <Icon size={11} strokeWidth={2} />
                  </span>
                </span>
                <span className="min-w-0 flex-1 text-[14px] leading-snug">
                  <span className="font-semibold">{fullName(actor)}</span>{" "}
                  <span className="text-ink-2">{verb}</span>
                  {n.preview && (
                    <span className="mt-0.5 block truncate text-ink-3">“{n.preview}”</span>
                  )}
                  <span className="mt-0.5 block text-[12px] text-ink-3">
                    {relativeTime(n.createdAt)}
                  </span>
                </span>
                {!n.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent" aria-label="Unread" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
