"use client";

import { createContext, useContext, useState } from "react";
import { CURRENT_USER_ID, NOW, initialNotifications, initialPosts } from "./data";
import type { AppNotification, LifeEvent, Post, ReactionType } from "./types";

// In-memory stand-in for the API until the endpoints exist.

type NewPost = { text: string; tagged: string[]; lifeEvent?: LifeEvent };

type Store = {
  posts: Post[];
  notifications: AppNotification[];
  unreadCount: number;
  addPost: (post: NewPost) => void;
  react: (postId: string, type: ReactionType) => void;
  addComment: (postId: string, text: string) => void;
  markAllRead: () => void;
};

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [posts, setPosts] = useState(initialPosts);
  const [notifications, setNotifications] = useState(initialNotifications);

  const updatePost = (postId: string, fn: (p: Post) => Post) =>
    setPosts((all) => all.map((p) => (p.id === postId ? fn(p) : p)));

  const store: Store = {
    posts,
    notifications,
    unreadCount: notifications.filter((n) => !n.read).length,
    addPost: ({ text, tagged, lifeEvent }) =>
      setPosts((all) => [
        {
          id: `p-${all.length + 1}-${Date.now()}`,
          authorId: CURRENT_USER_ID,
          createdAt: NOW.toISOString(),
          text,
          tagged,
          lifeEvent,
          reactions: [],
          comments: [],
        },
        ...all,
      ]),
    react: (postId, type) =>
      updatePost(postId, (p) => {
        const mine = p.reactions.find((r) => r.personId === CURRENT_USER_ID);
        const others = p.reactions.filter((r) => r.personId !== CURRENT_USER_ID);
        // Same reaction again removes it, like every other app.
        if (mine?.type === type) return { ...p, reactions: others };
        return { ...p, reactions: [...others, { personId: CURRENT_USER_ID, type }] };
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
