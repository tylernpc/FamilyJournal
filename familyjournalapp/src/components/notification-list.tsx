"use client";

import Image from "next/image";
import Link from "next/link";
import { useTransition } from "react";
import { markRead } from "@/app/f/[familyId]/actions";
import { fullName, relativeTime } from "@/lib/family";
import { useClock, useFamily } from "@/lib/family-context";
import type { AppNotification } from "@/lib/types";
import { Avatar } from "./avatar";

const VERB: Record<AppNotification["type"], string> = {
  postCreated: "shared",
  commentAdded: "commented:",
  reactionAdded: "reacted to your post",
  memberJoined: "joined the family journal",
  memberTagged: "tagged you in",
  mentioned: "mentioned you:",
};

function group(n: AppNotification, now: number) {
  const days = (now - new Date(n.createdAt).getTime()) / 86400000;
  if (days < 1) return "Today";
  if (days < 7) return "This week";
  return "Earlier";
}

export function NotificationList({ notifications }: { notifications: AppNotification[] }) {
  const { family, graph, unreadCount, href } = useFamily();
  const { now, timeZone } = useClock();
  const [, startTransition] = useTransition();
  const groups = ["Today", "This week", "Earlier"]
    .map((title) => ({ title, items: notifications.filter((n) => group(n, now) === title) }))
    .filter((g) => g.items.length);

  const read = (ids: string[] | null) => startTransition(async () => void (await markRead(family.id, ids)));

  return (
    <div className="mx-auto w-full max-w-[600px] pb-12 pt-6 lg:pt-10">
      <div className="flex items-end justify-between px-4">
        <h1 className="display text-[40px]">Activity</h1>
        {unreadCount > 0 && (
          <button onClick={() => read(null)} className="pb-1 text-[14px] font-semibold">
            Mark all read
          </button>
        )}
      </div>

      {groups.length === 0 && (
        <p className="px-4 py-16 text-center text-[15px] text-ink-3">
          Nothing yet. When family post, tag you or react, it shows up here.
        </p>
      )}

      {groups.map(({ title, items }) => (
        <section key={title} className="mt-6">
          <h2 className="px-4 text-[16px] font-semibold">{title}</h2>
          <ul className="mt-1">
            {items.map((n) => {
              const actor = n.actorId ? graph.getPerson(n.actorId) : undefined;
              const link = n.postId
                ? href(`/posts/${n.postId}`)
                : n.actorId
                  ? href(`/people/${n.actorId}`)
                  : href();
              return (
                <li key={n.id}>
                  <Link
                    href={link}
                    onClick={() => !n.read && read([n.id])}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-hover"
                  >
                    <span className="relative shrink-0">
                      {n.actorId ? (
                        <Avatar personId={n.actorId} size={46} />
                      ) : (
                        <span className="block h-[46px] w-[46px] rounded-full bg-sunken" />
                      )}
                      {!n.read && (
                        <span
                          className="absolute -left-1 top-0 h-3 w-3 rounded-full border-2 border-canvas bg-signal"
                          aria-label="New"
                        />
                      )}
                    </span>
                    <span className="min-w-0 flex-1 text-[15px] leading-snug">
                      <span className="font-semibold">{actor ? fullName(actor) : "Someone"}</span>{" "}
                      <span className="text-ink-2">{VERB[n.type]}</span>
                      {n.emoji && <span> {n.emoji}</span>}
                      {n.preview && <span> “{n.preview}”</span>}{" "}
                      <span className="text-ink-3">{relativeTime(n.createdAt, now, timeZone)}</span>
                    </span>
                    {n.thumb && (
                      <Image
                        src={n.thumb}
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
