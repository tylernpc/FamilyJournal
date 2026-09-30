"use client";

import { createContext, useContext, useState } from "react";
import type { Post } from "./types";

// The new-post sheet can be opened from anywhere, optionally with people pre-tagged,
// or with an existing post to edit.

type ComposerState = { tags: string[]; editing?: Post } | null;

type Composer = {
  composer: ComposerState;
  openComposer: (tags?: string[]) => void;
  editPost: (post: Post) => void;
  closeComposer: () => void;
};

const ComposerContext = createContext<Composer | null>(null);

export function ComposerProvider({ children }: { children: React.ReactNode }) {
  const [composer, setComposer] = useState<ComposerState>(null);

  return (
    <ComposerContext
      value={{
        composer,
        openComposer: (tags = []) => setComposer({ tags }),
        editPost: (post) => setComposer({ tags: post.tagged, editing: post }),
        closeComposer: () => setComposer(null),
      }}
    >
      {children}
    </ComposerContext>
  );
}

export function useComposer() {
  const composer = useContext(ComposerContext);
  if (!composer) throw new Error("useComposer must be used inside ComposerProvider");
  return composer;
}
