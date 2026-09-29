"use client";

import { createContext, useContext, useState } from "react";
import { CURRENT_USER_ID, NOW, initialNotifications, initialPosts } from "./data";
import type { AppNotification, LifeEvent, Photo, Post } from "./types";

// In-memory stand-in for the API until the endpoints exist.

type NewPost = { text: string; tagged: string[]; photos?: Photo[]; lifeEvent?: LifeEvent };

type Store = {
  posts: Post[];
  notifications: AppNotification[];
  unreadCount: number;
  addPost: (post: NewPost) => void;
  // Same emoji again removes it; a different one replaces yours.
  react: (postId: string, emoji: string) => void;
  addComment: (postId: string, text: string) => void;
  markAllRead: () => void;
  // The new-post sheet can be opened from anywhere, optionally with people pre-tagged.
  composer: { tags: string[] } | null;
  openComposer: (tags?: string[]) => void;
  closeComposer: () => void;
};

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [posts, setPosts] = useState(initialPosts);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [composer, setComposer] = useState<{ tags: string[] } | null>(null);

  const updatePost = (postId: string, fn: (p: Post) => Post) =>
    setPosts((all) => all.map((p) => (p.id === postId ? fn(p) : p)));

  const store: Store = {
    posts,
    notifications,
    unreadCount: notifications.filter((n) => !n.read).length,
    addPost: ({ text, tagged, photos, lifeEvent }) =>
      setPosts((all) => [
        {
          id: `p-${all.length + 1}-${Date.now()}`,
          authorId: CURRENT_USER_ID,
          createdAt: NOW.toISOString(),
          text,
          tagged,
          photos: photos?.length ? photos : undefined,
          lifeEvent,
          reactions: [],
          comments: [],
        },
        ...all,
      ]),
    react: (postId, emoji) =>
      updatePost(postId, (p) => {
        const mine = p.reactions.find((r) => r.personId === CURRENT_USER_ID);
        const others = p.reactions.filter((r) => r.personId !== CURRENT_USER_ID);
        if (mine?.emoji === emoji) return { ...p, reactions: others };
        return { ...p, reactions: [...others, { personId: CURRENT_USER_ID, emoji }] };
      }),
    addComment: (postId, text) =>
      updatePost(postId, (p) => ({
        ...p,
        comments: [
          ...p.comments,
          {
            id: `c-${Date.now()}`,
            authorId: CURRENT_USER_ID,
            text,
            createdAt: NOW.toISOString(),
          },
        ],
      })),
    composer,
    openComposer: (tags = []) => setComposer({ tags }),
    closeComposer: () => setComposer(null),
    markAllRead: () =>
      setNotifications((all) => all.map((n) => ({ ...n, read: true }))),
  };

  return <StoreContext value={store}>{children}</StoreContext>;
}

export function useStore() {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useStore must be used inside StoreProvider");
  return store;
}
