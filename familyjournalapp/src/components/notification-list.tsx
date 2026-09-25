"use client";

import Image from "next/image";
import Link from "next/link";
import { NOW } from "@/lib/data";
import { fullName, getPerson, relativeTime } from "@/lib/family";
import { useStore } from "@/lib/store";
import type { AppNotification } from "@/lib/types";
import { Avatar } from "./avatar";

const VERB: Record<AppNotification["type"], string> = {
  postCreated: "shared",
  commentAdded: "commented:",
  reactionAdded: "loved your post",
  memberJoined: "joined the family journal",
  memberTagged: "tagged you in",
};

function group(n: AppNotification) {
  const days = (NOW.getTime() - new Date(n.createdAt).getTime()) / 86400000;
  if (days < 1) return "Today";
  if (days < 7) return "This week";
  return "Earlier";
}

export function NotificationList() {
  const { notifications, posts, unreadCount, markAllRead } = useStore();
  const groups = ["Today", "This week", "Earlier"]
    .map((title) => ({ title, items: notifications.filter((n) => group(n) === title) }))
    .filter((g) => g.items.length);

  return (
    <div className="mx-auto w-full max-w-[600px] pb-12 pt-6 lg:pt-10">
      <div className="flex items-end justify-between px-4">
        <h1 className="display text-[40px]">Activity</h1>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="pb-1 text-[14px] font-semibold">
            Mark all read
          </button>
        )}
      </div>

      {groups.map(({ title, items }) => (
        <section key={title} className="mt-6">
          <h2 className="px-4 text-[16px] font-semibold">{title}</h2>
          <ul className="mt-1">
            {items.map((n) => {
              const actor = getPerson(n.actorId);
              const post = posts.find((p) => p.id === n.postId);
              const thumb = post?.photos?.[0];
              const href = n.postId ? `/?person=${n.actorId}` : `/people/${n.actorId}`;
              return (
                <li key={n.id}>
                  <Link href={href} className="flex items-center gap-3 px-4 py-2.5 hover:bg-hover">
                    <span className="relative shrink-0">
                      <Avatar personId={n.actorId} size={46} />
                      {!n.read && (
                        <span className="absolute -left-1 top-0 h-3 w-3 rounded-full border-2 border-canvas bg-signal" aria-label="New" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1 text-[15px] leading-snug">
                      <span className="font-semibold">{fullName(actor)}</span>{" "}
                      <span className="text-ink-2">{VERB[n.type]}</span>
                      {n.preview && <span> “{n.preview}”</span>}{" "}
                      <span className="text-ink-3">{relativeTime(n.createdAt)}</span>
                    </span>
                    {thumb && (
                      <Image
                        src={`${thumb.src.split("?")[0]}?w=96&h=96&fit=crop&q=70`}
                        alt=""
                        width={48}
                        height={48}
                        className="h-12 w-12 shrink-0 rounded-md object-cover"
                      />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
