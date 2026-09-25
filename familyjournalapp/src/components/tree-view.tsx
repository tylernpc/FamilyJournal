"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CURRENT_USER_ID, people } from "@/lib/data";
import {
  companions,
  fullName,
  getPerson,
  isRecent,
  kinship,
  lifespan,
  peopleInPost,
  photoUrl,
  postInvolves,
  sharedPosts,
  spouseOf,
} from "@/lib/family";
import { useStore } from "@/lib/store";
import { NODE_H, NODE_W, PHOTO_H, layoutTree, type NodeBox } from "@/lib/tree-layout";
import type { Post } from "@/lib/types";
import { Avatar } from "./avatar";
import { ArrowLeftIcon, CloseIcon, FitIcon, MinusIcon, PlusIcon } from "./icons";
import { PostSnippet } from "./post-snippet";

const layout = layoutTree();

type Thread = { a: string; b: string; count: number };
type View = { x: number; y: number; scale: number };

// Every pair of people who appear together in a post becomes a thread.
function threadsFor(posts: Post[], focus?: string): Thread[] {
  const counts = new Map<string, number>();
  for (const post of posts) {
    const ids = peopleInPost(post);
    for (let i = 0; i < ids.length; i++)
      for (let j = i + 1; j < ids.length; j++) {
        if (focus && ids[i] !== focus && ids[j] !== focus) continue;
        const key = [ids[i], ids[j]].sort().join("|");
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
  }
  return [...counts.entries()].map(([key, count]) => {
    const [a, b] = key.split("|");
    return { a, b, count };
  });
}

function threadPath(A: NodeBox, B: NodeBox) {
  let [top, bottom] = A.y <= B.y ? [A, B] : [B, A];
  const tx = top.x + NODE_W / 2;
  const bx = bottom.x + NODE_W / 2;
  if (top.y === bottom.y) {
    // Same generation: arc over the row.
    if (top.x > bottom.x) [top, bottom] = [bottom, top];
    const x1 = top.x + NODE_W / 2;
    const x2 = bottom.x + NODE_W / 2;
    const lift = 34 + Math.abs(x2 - x1) * 0.12;
    const y = top.y;
    return {
      d: `M ${x1} ${y} C ${x1} ${y - lift}, ${x2} ${y - lift}, ${x2} ${y}`,
      mid: { x: (x1 + x2) / 2, y: y - lift * 0.75 },
    };
  }
  const y1 = top.y + NODE_H;
  const y2 = bottom.y;
  const dy = y2 - y1;
  return {
    d: `M ${tx} ${y1} C ${tx} ${y1 + dy * 0.55}, ${bx} ${y2 - dy * 0.55}, ${bx} ${y2}`,
    mid: { x: (tx + bx) / 2, y: (y1 + y2) / 2 },
  };
}

function relationSentence(a: string, b: string) {
  if (a === CURRENT_USER_ID) return `${getPerson(b).firstName} is your ${kinship(a, b).toLowerCase()}`;
  if (b === CURRENT_USER_ID) return `${getPerson(a).firstName} is your ${kinship(b, a).toLowerCase()}`;
  return `${getPerson(b).firstName} is ${getPerson(a).firstName}'s ${kinship(a, b).toLowerCase()}`;
}

export function TreeView({
  initialPerson,
  initialBetween,
}: {
  initialPerson?: string;
  initialBetween?: string;
}) {
  const { posts } = useStore();
  const [selected, setSelected] = useState<string | null>(initialPerson ?? null);
  const [between, setBetween] = useState<string | null>(
    initialPerson ? (initialBetween ?? null) : null,
  );
  const [hoverPost, setHoverPost] = useState<string | null>(null);
  const [pinnedPost, setPinnedPost] = useState<string | null>(null);

  const focusPost = posts.find((p) => p.id === (hoverPost ?? pinnedPost));

  // What the canvas should emphasize, in priority order.
  let highlight: Set<string> | null = null;
  let threads: Thread[] = [];
  if (focusPost) {
    const ids = peopleInPost(focusPost);
    highlight = new Set(ids);
    threads = threadsFor([focusPost]);
  } else if (selected && between) {
    highlight = new Set([selected, between]);
    threads = [{ a: selected, b: between, count: sharedPosts(posts, selected, between).length }];
  } else if (selected) {
    threads = threadsFor(posts, selected);
    highlight = new Set([selected, ...threads.flatMap((t) => [t.a, t.b])]);
  }

  const selectPerson = (id: string | null) => {
    setSelected(id);
    setBetween(null);
    setPinnedPost(null);
    setHoverPost(null);
  };

  return (
    <div className="flex h-[calc(100dvh-112px-env(safe-area-inset-top)-env(safe-area-inset-bottom))] min-h-0 lg:h-dvh">
      <Canvas
        focusId={initialPerson ?? CURRENT_USER_ID}
        posts={posts}
        selected={selected}
        highlight={highlight}
        threads={threads}
        onSelect={selectPerson}
        onThread={(t) => {
          const [self, other] = selected === t.b ? [t.b, t.a] : [t.a, t.b];
          setSelected(self);
          setBetween(other);
          setPinnedPost(null);
        }}
      />

      <aside
        className={`${
          selected
            ? "fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-40 max-h-[58dvh] rounded-t-2xl border-t shadow-pop"
            : "hidden"
        } flex flex-col overflow-hidden border-line bg-surface lg:static lg:flex lg:max-h-none lg:w-[380px] lg:rounded-none lg:border-l lg:border-t-0 lg:shadow-none`}
      >
        <span className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-line-strong lg:hidden" aria-hidden="true" />
        {!selected && (
          <Overview
            posts={posts}
            activePost={pinnedPost}
            onHover={setHoverPost}
            onPin={(id) => setPinnedPost(pinnedPost === id ? null : id)}
          />
        )}
        {selected && !between && (
          <PersonPanel
            id={selected}
            posts={posts}
            activePost={pinnedPost}
            onClose={() => selectPerson(null)}
            onBetween={(id) => {
              setBetween(id);
              setPinnedPost(null);
            }}
            onHover={setHoverPost}
            onPin={(id) => setPinnedPost(pinnedPost === id ? null : id)}
          />
        )}
        {selected && between && (
          <BetweenPanel
            a={selected}
            b={between}
            posts={posts}
            activePost={pinnedPost}
            onBack={() => {
              setBetween(null);
              setPinnedPost(null);
            }}
            onHover={setHoverPost}
            onPin={(id) => setPinnedPost(pinnedPost === id ? null : id)}
          />
        )}
      </aside>
    </div>
  );
}

// ---------------------------------------------------------------------------

function Canvas({
  focusId,
  posts,
  selected,
  highlight,
  threads,
  onSelect,
  onThread,
}: {
  focusId: string;
  posts: Post[];
  selected: string | null;
  highlight: Set<string> | null;
  threads: Thread[];
  onSelect: (id: string | null) => void;
  onThread: (t: Thread) => void;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const [view, setViewState] = useState<View>({ x: 0, y: 0, scale: 1 });
  const viewRef = useRef(view);
  const setView = (next: View) => {
    viewRef.current = next;
    setViewState(next);
  };

  // Once someone pans or zooms, stop re-centering on resize.
  const touched = useRef(false);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ view: View; x: number; y: number; dist: number; moved: boolean } | null>(
    null,
  );
  // A drag that ends on a card should not also select it.
  const suppressClick = useRef(false);
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  });

  // Null once unmounted: observers and timers can still fire during navigation or HMR.
  const size = () => viewport.current?.getBoundingClientRect() ?? null;

  const fitAll = () => {
    const rect = size();
    if (!rect) return;
    const { width, height } = rect;
    const scale = Math.min(1, (width - 32) / layout.width, (height - 104) / layout.height);
    setView({
      scale,
      x: (width - layout.width * scale) / 2,
      y: Math.max(88, (height - layout.height * scale) / 2),
    });
  };

  // Default view: a person and their spouse at a readable size, parents peeking in above.
  const focusOn = (id: string) => {
    const rect = size();
    if (!rect) return;
    const { width, height } = rect;
    const box = layout.nodes.get(id)!;
    const spouse = spouseOf(id);
    const partner = spouse ? layout.nodes.get(spouse) : undefined;
    const left = Math.min(box.x, partner?.x ?? box.x);
    const right = Math.max(box.x, partner?.x ?? box.x) + NODE_W;
    const scale = Math.min(1, (width - 40) / (right - left));
    setView({
      scale,
      x: width / 2 - ((left + right) / 2) * scale,
      y: height * 0.56 - (box.y + PHOTO_H / 2) * scale,
    });
  };

  // The observer fires once on mount too, which sets the opening view.
  // Helpers below only touch refs and the static layout, so effects subscribe once.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      if (!touched.current) focusOn(focusId);
      setReady(true);
    });
    observer.observe(viewport.current!);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clampScale = (s: number) => Math.min(1.6, Math.max(0.25, s));

  const zoomAround = (px: number, py: number, factor: number) => {
    const v = viewRef.current;
    const scale = clampScale(v.scale * factor);
    const k = scale / v.scale;
    setView({ scale, x: px - (px - v.x) * k, y: py - (py - v.y) * k });
  };

  // Trackpad/mouse wheel: scroll pans, ctrl/cmd + scroll (and trackpad pinch) zooms.
  useEffect(() => {
    const el = viewport.current!;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      touched.current = true;
      const rect = el.getBoundingClientRect();
      if (e.ctrlKey || e.metaKey) {
        zoomAround(e.clientX - rect.left, e.clientY - rect.top, Math.exp(-e.deltaY * 0.01));
      } else {
        const v = viewRef.current;
        setView({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY });
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // One pointer drags, two pointers pinch. Works when the gesture starts on a card.
  const startGesture = () => {
    const pts = [...pointers.current.values()];
    if (!pts.length) {
      gesture.current = null;
      return;
    }
    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    const dist = pts.length > 1 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : 0;
    gesture.current = {
      view: viewRef.current,
      x: cx,
      y: cy,
      dist,
      moved: gesture.current?.moved ?? false,
    };
  };

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!pointers.current.has(e.pointerId)) return;
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const g = gesture.current;
      if (!g) return;
      const pts = [...pointers.current.values()];
      const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
      const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
      const pinching = pts.length > 1 && g.dist > 0;
      if (!g.moved && !pinching && Math.abs(cx - g.x) + Math.abs(cy - g.y) < 5) return;
      g.moved = true;
      touched.current = true;

      const rect = size();
      if (!rect) return;
      const scale = pinching
        ? clampScale(g.view.scale * (Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) / g.dist))
        : g.view.scale;
      const k = scale / g.view.scale;
      setView({
        scale,
        x: cx - rect.left - (g.x - rect.left - g.view.x) * k,
        y: cy - rect.top - (g.y - rect.top - g.view.y) * k,
      });
    };

    const onUp = (e: PointerEvent) => {
      if (!pointers.current.delete(e.pointerId)) return;
      const g = gesture.current;
      if (g?.moved) suppressClick.current = true;
      if (pointers.current.size) {
        startGesture();
        return;
      }
      const target = e.target as Element | null;
      if (g && !g.moved && target && !target.closest("button")) onSelectRef.current(null);
      gesture.current = null;
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, []);

  // On phones the person sheet covers the lower half, so bring the card into the top part.
  const revealAbovePanel = (id: string) => {
    const rect = size();
    if (!rect) return;
    const { width, height } = rect;
    if (width >= 1024) return;
    const box = layout.nodes.get(id)!;
    const { scale } = viewRef.current;
    touched.current = true;
    setView({
      scale,
      x: width / 2 - (box.x + NODE_W / 2) * scale,
      y: height * 0.2 - (box.y + PHOTO_H / 2) * scale,
    });
  };

  const zoomBy = (factor: number) => {
    touched.current = true;
    const rect = size();
    if (!rect) return;
    const { width, height } = rect;
    zoomAround(width / 2, height / 2, factor);
  };

  const recent = new Set(
    people
      .filter((p) => posts.some((post) => postInvolves(post, p.id) && isRecent(post.createdAt)))
      .map((p) => p.id),
  );

  const dim = (id: string) => (highlight && !highlight.has(id) ? "opacity-35" : "");
  const maxCount = Math.max(1, ...threads.map((t) => t.count));

  return (
    <div className="relative min-w-0 flex-1 overflow-hidden bg-canvas">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 p-4">
        <div className="pointer-events-auto min-w-0 rounded-md bg-canvas/85 pr-2 backdrop-blur-sm">
          <h1 className="font-serif text-[22px] leading-tight sm:text-[24px]">Family tree</h1>
          <p className="text-[13px] text-ink-3">
            {people.length} people · {layout.generations} generations
          </p>
        </div>
        <div className="pointer-events-auto flex shrink-0 overflow-hidden rounded-md border border-line bg-surface">
          <ZoomButton
            label="Center on you"
            onClick={() => {
              touched.current = false;
              focusOn(CURRENT_USER_ID);
            }}
            className="w-auto gap-1.5 px-2.5 text-[13px]"
          >
            <Avatar personId={CURRENT_USER_ID} size={18} />
            Me
          </ZoomButton>
          <ZoomButton
            label="Zoom out"
            onClick={() => zoomBy(1 / 1.2)}
            className="hidden border-l border-line sm:flex"
          >
            <MinusIcon size={16} />
          </ZoomButton>
          <span className="hidden w-12 items-center justify-center border-x border-line text-[12px] tabular-nums text-ink-2 sm:flex">
            {Math.round(view.scale * 100)}%
          </span>
          <ZoomButton label="Zoom in" onClick={() => zoomBy(1.2)} className="hidden sm:flex">
            <PlusIcon size={16} />
          </ZoomButton>
          <ZoomButton
            label="Show whole tree"
            onClick={() => {
              touched.current = true;
              fitAll();
            }}
            className="border-l border-line"
          >
            <FitIcon size={16} />
          </ZoomButton>
        </div>
      </div>

      <div
        ref={viewport}
        className="h-full w-full cursor-grab touch-none select-none active:cursor-grabbing"
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          suppressClick.current = false;
          pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          if (pointers.current.size === 1) gesture.current = null;
          startGesture();
        }}
        onClickCapture={(e) => {
          if (suppressClick.current) {
            e.stopPropagation();
            e.preventDefault();
            suppressClick.current = false;
          }
        }}
      >
        <div
          className={`relative origin-top-left ${ready ? "" : "invisible"}`}
          style={{
            width: layout.width,
            height: layout.height,
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
          }}
        >
          <svg
            className="absolute inset-0 overflow-visible"
            width={layout.width}
            height={layout.height}
            aria-hidden="true"
          >
            <g
              stroke="var(--tree-line)"
              strokeWidth={1.5}
              fill="none"
              className={`transition-opacity ${highlight ? "opacity-50" : ""}`}
            >
              {layout.connectors.map((c, i) => {
                if (c.kind === "couple") return <path key={i} d={`M ${c.x1} ${c.y} H ${c.x2}`} />;
                const left = Math.min(c.fromX, ...c.childXs);
                const right = Math.max(c.fromX, ...c.childXs);
                return (
                  <g key={i}>
                    <path d={`M ${c.fromX} ${c.fromY} V ${c.busY}`} />
                    <path d={`M ${left} ${c.busY} H ${right}`} />
                    {c.childXs.map((x) => (
                      <path key={x} d={`M ${x} ${c.busY} V ${c.childY}`} />
                    ))}
                  </g>
                );
              })}
            </g>

            <g fill="none" stroke="var(--accent)" strokeLinecap="round">
              {threads.map((t) => {
                const { d } = threadPath(layout.nodes.get(t.a)!, layout.nodes.get(t.b)!);
                return (
                  <path
                    key={`${t.a}-${t.b}`}
                    d={d}
                    strokeWidth={1.5 + (t.count / maxCount) * 1.5}
                    strokeDasharray="1 5"
                    opacity={0.9}
                  />
                );
              })}
            </g>
          </svg>

          {people.map((p) => {
            const box = layout.nodes.get(p.id);
            if (!box) return null;
            const isSelected = selected === p.id;
            const isMe = p.id === CURRENT_USER_ID;
            return (
              <button
                key={p.id}
                onClick={() => {
                  onSelect(isSelected ? null : p.id);
                  if (!isSelected) revealAbovePanel(p.id);
                }}
                className={`group absolute flex flex-col text-left transition-opacity ${dim(p.id)}`}
                style={{ left: box.x, top: box.y, width: NODE_W, height: NODE_H }}
                aria-pressed={isSelected}
              >
                <span
                  className={`relative block w-full overflow-hidden rounded-[4px] bg-sunken ${
                    isSelected
                      ? "ring-2 ring-ink ring-offset-2 ring-offset-canvas"
                      : "ring-1 ring-black/5 group-hover:ring-black/20 dark:ring-white/10"
                  }`}
                  style={{ height: PHOTO_H }}
                >
                  {photoUrl(p, NODE_W, PHOTO_H) ? (
                    <Image
                      src={photoUrl(p, NODE_W, PHOTO_H)!}
                      alt={fullName(p)}
                      width={NODE_W}
                      height={PHOTO_H}
                      draggable={false}
                      className={`h-full w-full object-cover ${
                        p.lifeStatus === "deceased" ? "grayscale" : ""
                      }`}
                    />
                  ) : (
                    <span className="flex h-full items-center justify-center font-serif text-[40px] text-ink-3">
                      {p.firstName[0]}
                    </span>
                  )}
                  {recent.has(p.id) && (
                    <span
                      className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-white"
                      title="In a post this week"
                    />
                  )}
                </span>
                <span
                  className={`mt-2.5 w-full truncate text-[16px] font-medium leading-tight ${
                    p.lifeStatus === "deceased" ? "text-ink-2" : "text-ink"
                  }`}
                >
                  {p.firstName} {p.lastName}
                </span>
                <span className="mt-0.5 w-full truncate text-[13px] text-ink-3">
                  {isMe ? "You" : kinship(CURRENT_USER_ID, p.id)}
                  {lifespan(p) && <> · {lifespan(p)}</>}
                </span>
              </button>
            );
          })}

          {threads.map((t) => {
            const { mid } = threadPath(layout.nodes.get(t.a)!, layout.nodes.get(t.b)!);
            return (
              <button
                key={`b-${t.a}-${t.b}`}
                onClick={() => onThread(t)}
                title={`${t.count} shared post${t.count > 1 ? "s" : ""}: ${fullName(getPerson(t.a))} & ${fullName(getPerson(t.b))}`}
                className="absolute flex h-[22px] min-w-[22px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-accent bg-surface px-1.5 text-[11px] font-semibold tabular-nums text-accent-ink hover:bg-accent-soft"
                style={{ left: mid.x, top: mid.y }}
              >
                {t.count}
              </button>
            );
          })}
        </div>
      </div>

      <Legend />
    </div>
  );
}

function ZoomButton({
  label,
  onClick,
  className = "",
  children,
}: {
  label: string;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex h-8 w-8 items-center justify-center text-ink-2 hover:bg-hover hover:text-ink ${className}`}
    >
      {children}
    </button>
  );
}

function Legend() {
  return (
    <div className="pointer-events-none absolute bottom-4 left-4 hidden flex-wrap gap-x-4 gap-y-1 rounded-md border border-line bg-surface/90 px-3 py-2 text-[12px] text-ink-2 backdrop-blur sm:flex">
      <span className="flex items-center gap-1.5">
        <svg width="18" height="8" aria-hidden="true">
          <path d="M1 4 H17" stroke="var(--tree-line)" strokeWidth="1.5" />
        </svg>
        Family
      </span>
      <span className="flex items-center gap-1.5">
        <svg width="18" height="8" aria-hidden="true">
          <path d="M1 4 H17" stroke="var(--accent)" strokeWidth="2" strokeDasharray="1 4" strokeLinecap="round" />
        </svg>
        Shared posts
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-accent" />
        In a post this week
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Side panels

type ListProps = {
  posts: Post[];
  activePost: string | null;
  onHover: (id: string | null) => void;
  onPin: (id: string) => void;
};

function SnippetList({ posts, activePost, onHover, onPin }: ListProps) {
  return (
    <div className="space-y-0.5">
      {posts.map((post) => (
        <PostSnippet
          key={post.id}
          post={post}
          active={activePost === post.id}
          onHover={(h) => onHover(h ? post.id : null)}
          onClick={() => onPin(post.id)}
        />
      ))}
    </div>
  );
}

function Overview(props: ListProps) {
  return (
    <div className="overflow-y-auto px-3 py-5">
      <div className="px-2">
        <h2 className="text-[15px] font-semibold">Across the tree</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-3">
          Every post links the people tagged in it. Point at one to see who it brings together, or
          pick a person to follow their threads.
        </p>
      </div>
      <div className="mt-4">
        <SnippetList {...props} posts={props.posts.slice(0, 8)} />
      </div>
    </div>
  );
}

function PersonPanel({
  id,
  onClose,
  onBetween,
  ...list
}: ListProps & { id: string; onClose: () => void; onBetween: (id: string) => void }) {
  const person = getPerson(id);
  const theirs = list.posts.filter((p) => postInvolves(p, id));
  const together = companions(list.posts, id);
  const isMe = id === CURRENT_USER_ID;

  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex items-start gap-3 border-b border-line p-5">
        <Avatar personId={id} size={52} />
        <div className="min-w-0 flex-1">
          <h2 className="font-serif text-[22px] leading-tight">{fullName(person)}</h2>
          <p className="mt-0.5 text-[13px] text-ink-3">
            {isMe ? "You" : kinship(CURRENT_USER_ID, id)}
            {lifespan(person) && <> · {lifespan(person)}</>}
          </p>
          {person.isPlaceholder && (
            <p className="mt-1 text-[12px] text-ink-3">
              {person.lifeStatus === "deceased"
                ? `Profile kept by ${getPerson(person.addedBy ?? CURRENT_USER_ID).firstName}`
                : person.inviteSentAt
                  ? "Invited · hasn't joined yet"
                  : `Added by ${getPerson(person.addedBy ?? CURRENT_USER_ID).firstName}`}
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <Link
              href={`/people/${id}`}
              className="flex h-8 items-center rounded-md border border-line px-3 text-[13px] font-medium hover:bg-hover"
            >
              View profile
            </Link>
            {!isMe && (
              <Link
                href={`/?with=${id}`}
                className="flex h-8 items-center rounded-md px-3 text-[13px] text-ink-2 hover:bg-hover"
              >
                Post with {person.firstName}
              </Link>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="-mr-1.5 -mt-1 rounded-md p-1.5 text-ink-3 hover:bg-hover hover:text-ink"
        >
          <CloseIcon size={18} />
        </button>
      </div>

      <div className="min-h-0 overflow-y-auto px-3 py-4">
        <h3 className="px-2 text-[13px] font-semibold text-ink-2">Shows up with</h3>
        {together.length ? (
          <ul className="mt-2">
            {together.map(({ id: other, count }) => (
              <li key={other}>
                <button
                  onClick={() => onBetween(other)}
                  className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left hover:bg-hover"
                >
                  <Avatar personId={other} size={30} />
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="block truncate text-[14px] font-medium">
                      {fullName(getPerson(other))}
                    </span>
                    <span className="text-[12px] text-ink-3">
                      {isMe ? "Your" : `${person.firstName}'s`} {kinship(id, other).toLowerCase()}
                    </span>
                  </span>
                  <span className="text-[12px] tabular-nums text-ink-3">
                    {count} post{count > 1 ? "s" : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-2 pt-1 text-[13px] text-ink-3">
            Not tagged alongside anyone yet.
          </p>
        )}

        <h3 className="mt-6 px-2 text-[13px] font-semibold text-ink-2">Latest</h3>
        <div className="mt-1">
          {theirs.length ? (
            <SnippetList {...list} posts={theirs.slice(0, 5)} />
          ) : (
            <p className="px-2 pt-1 text-[13px] text-ink-3">No posts yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function BetweenPanel({
  a,
  b,
  onBack,
  ...list
}: ListProps & { a: string; b: string; onBack: () => void }) {
  const shared = sharedPosts(list.posts, a, b);
  return (
    <div className="flex min-h-0 flex-col">
      <div className="border-b border-line p-5">
        <button
          onClick={onBack}
          className="-ml-1.5 mb-3 flex items-center gap-1 rounded px-1.5 py-0.5 text-[13px] text-ink-2 hover:bg-hover"
        >
          <ArrowLeftIcon size={16} />
          {getPerson(a).firstName}
        </button>
        <div className="flex items-center gap-3">
          <span className="flex -space-x-3">
            <Avatar personId={a} size={44} className="rounded-full ring-2 ring-surface" />
            <Avatar personId={b} size={44} className="rounded-full ring-2 ring-surface" />
          </span>
          <div className="min-w-0">
            <h2 className="font-serif text-[21px] leading-tight">
              {getPerson(a).firstName} &amp; {getPerson(b).firstName}
            </h2>
            <p className="text-[13px] text-ink-3">{relationSentence(a, b)}</p>
          </div>
        </div>
      </div>

      <div className="min-h-0 overflow-y-auto px-3 py-4">
        <h3 className="px-2 text-[13px] font-semibold text-ink-2">
          Together in {shared.length} post{shared.length === 1 ? "" : "s"}
        </h3>
        <div className="mt-1">
          <SnippetList {...list} posts={shared} />
        </div>
        <Link
          href={`/?with=${[a, b].filter((id) => id !== CURRENT_USER_ID).join(",")}`}
          className="mx-2 mt-4 flex h-9 items-center justify-center rounded-md border border-dashed border-line-strong text-[13px] text-ink-2 hover:bg-hover hover:text-ink"
        >
          Add a post with both of them
        </Link>
      </div>
    </div>
  );
}
