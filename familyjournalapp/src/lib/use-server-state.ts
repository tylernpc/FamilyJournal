"use client";

import { useState } from "react";

// Local state seeded from server data, for changes the page makes itself (a new reaction or comment).
// Whenever the server sends fresh data, it replaces the local copy.
export function useServerState<T>(value: T) {
  const [state, setState] = useState(value);
  const [seen, setSeen] = useState(value);
  if (value !== seen) {
    setSeen(value);
    setState(value);
  }
  return [state, setState] as const;
}
