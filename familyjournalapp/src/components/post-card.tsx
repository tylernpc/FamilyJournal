"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { addComment, deleteComment, deletePost, react } from "@/app/f/[familyId]/actions";
import { useComposer } from "@/lib/composer";
import { fullName, lifespan, longDate, mentionedIds, relativeTime } from "@/lib/family";
import { useClock, useFamily } from "@/lib/family-context";
import { lifeEventLabel } from "@/lib/life-events";
import { frame } from "@/lib/photo";
import type { Comment, Photo, Post, Reaction } from "@/lib/types";
import { useDismiss } from "@/lib/use-dismiss";
import { useServerState } from "@/lib/use-server-state";
import { Avatar } from "./avatar";
import { CommentIcon, LinkIcon, MoreIcon, PencilIcon, TrashIcon } from "./icons";
import { MentionInput } from "./mention-input";
import { MentionText } from "./mention-text";
import { ReactionBar, ReactionSummary } from "./reactions";
import { ConfirmSheet } from "./sheet";

function Name({ id }: { id: string }) {
  const { me, graph, href } = useFamily();
  return (
    <Link href={href(`/people/${id}`)} className="font-semibold hover:underline">
      {id === me ? "You" : fullName(graph.getPerson(id))}
    </Link>
  );
}

function Byline({ post }: { post: Post }) {
  const { graph } = useFamily();
  const tagged = post.tagged.filter((id) => id !== post.authorId);
  const [first, ...rest] = tagged;
  return (
    <span>
      <Name id={post.authorId} />
      {first && (
        <>
          <span className="text-ink-2"> with </span>
          <Name id={first} />
        </>
      )}
      {rest.length === 1 && (
        <>
          <span className="text-ink-2"> and </span>
          <Name id={rest[0]} />
        </>
      )}
      {rest.length > 1 && (
        <span className="text-ink-2">
          {" "}
          and{" "}
          <span
            className="font-semibold text-ink"
            title={rest.map((id) => fullName(graph.getPerson(id))).join(", ")}
          >
            {rest.length} others
          </span>
        </span>
      )}
    </span>
  );
}

function useEventLine(post: Post) {
  const { graph } = useFamily();
  const event = post.lifeEvent;
  if (!event) return "";
  const subject = graph.findPerson(post.tagged[0]);
  const when =
    (event.type === "memorial" || event.type === "passing") && subject && lifespan(subject)
      ? lifespan(subject)
      : longDate(event.date);
  return `${lifeEventLabel(event)} · ${when}`;
}

// One post. On the feed it shows the latest comments; on the post's own page (`full`), all of them.
export function PostCard({ post, full = false }: { post: Post; full?: boolean }) {
  const { family, me, graph, people, href } = useFamily();
  const { now, timeZone } = useClock();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [reactions, setReactions] = useServerState<Reaction[]>(post.reactions);
  const [comments, setComments] = useServerState<Comment[]>(post.comments);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string>();
  const [sending, startSending] = useTransition();

  const relation = post.authorId === me ? null : graph.kinship(me, post.authorId);
  // Comments added here count on top of the server's total until the next refresh brings them in.
  const total = post.commentCount + comments.length - post.comments.length;
  const hidden = total - comments.length;
  const cover = graph.eventCover(post);
  const photos = post.photos.length ? post.photos.map((p) => frame(p, "post")) : cover ? [cover] : [];
  const eventLine = useEventLine(post);

  const onReact = (emoji: string | null) => {
    const before = reactions;
    const others = reactions.filter((r) => r.personId !== me);
    setReactions(emoji ? [...others, { personId: me, emoji }] : others);
    react(family.id, post.id, emoji).then((result) => {
      if (result.ok) setReactions(result.data);
      else setReactions(before);
    });
  };

  const submit = () => {
    const text = draft.trim();
    if (!text || sending) return;
    setError(undefined);
    startSending(async () => {
      const result = await addComment(family.id, post.id, text, mentionedIds(text, people));
      if (!result.ok) return setError(result.error);
      setComments((all) => [...all, result.data]);
      setDraft("");
    });
  };

  return (
    <article className="py-5">
      <header className="flex items-center gap-3 px-4">
        <Link href={href(`/people/${post.authorId}`)} className="shrink-0">
          <Avatar personId={post.authorId} size={38} />
        </Link>
        <div className="min-w-0 flex-1 text-[15px] leading-snug">
          <Byline post={post} />
          <div className="text-[13px] text-ink-3">
            {relation && <>{relation} · </>}
            <Link href={href(`/posts/${post.id}`)} className="hover:underline">
              <time dateTime={post.createdAt}>{relativeTime(post.createdAt, now, timeZone)}</time>
            </Link>
            {post.updatedAt && <> · Edited</>}
          </div>
        </div>
        <PostMenu post={post} leavingPage={full} />
      </header>

      {photos.length > 0 ? (
        <Media post={post} photos={photos} eventLine={eventLine} />
      ) : (
        post.lifeEvent && (
          <div className="px-4 pt-4">
            <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-3">{eventLine}</div>
            <h3 className="display mt-1.5 text-[30px]">{post.lifeEvent.title}</h3>
          </div>
        )
      )}

      {post.text && (
        <p className="whitespace-pre-line px-4 pt-3 text-[15px] leading-[1.5]">
          <MentionText text={post.text} />
        </p>
      )}

      <div className="flex items-start gap-2 px-4 pt-3">
        <div className="min-w-0 flex-1">
          <ReactionBar reactions={reactions} onReact={onReact} />
        </div>
        <button
          onClick={() => inputRef.current?.focus()}
          aria-label="Comment"
          className="-mr-2 flex h-8 w-10 shrink-0 items-center justify-center rounded-full hover:bg-hover"
        >
          <CommentIcon size={23} />
        </button>
      </div>
      <div className="px-4 pt-1.5">
        <ReactionSummary reactions={reactions} />
      </div>

      {(comments.length > 0 || hidden > 0) && (
        <div className="space-y-1 px-4 pt-1 text-[14px] leading-snug">
          {hidden > 0 && (
            <Link href={href(`/posts/${post.id}`)} className="block pb-0.5 text-ink-3 hover:text-ink-2">
              View all {total} comments
            </Link>
          )}
          {comments.map((c) => (
            <CommentRow key={c.id} comment={c} postId={post.id} deletable={full && c.canDelete} />
          ))}
        </div>
      )}

      <div className="flex items-center gap-2.5 px-4 pt-3">
        <Avatar personId={me} size={26} />
        <MentionInput
          ref={inputRef}
          value={draft}
          onChange={setDraft}
          onSubmit={submit}
          placeholder="Add a comment…"
          aria-label="Add a comment"
          className="py-1 text-[14px] leading-snug"
        />
        {draft.trim() && (
          <button onClick={submit} disabled={sending} className="text-[14px] font-semibold disabled:opacity-40">
            {sending ? "Posting…" : "Post"}
          </button>
        )}
      </div>
      {error && <p className="px-4 pt-2 text-[13px] text-danger">{error}</p>}
    </article>
  );
}

function CommentRow({ comment, postId, deletable }: { comment: Comment; postId: string; deletable: boolean }) {
  const { family, graph, href } = useFamily();
  const { now, timeZone } = useClock();
  const [pending, startTransition] = useTransition();

  return (
    <p className={pending ? "opacity-40" : ""}>
      <Link href={href(`/people/${comment.authorId}`)} className="mr-1.5 font-semibold hover:underline">
        {fullName(graph.getPerson(comment.authorId))}
      </Link>
      <MentionText text={comment.text} />
      {deletable && (
        <span className="ml-2 whitespace-nowrap text-[12px] text-ink-3">
          {relativeTime(comment.createdAt, now, timeZone)} ·{" "}
          <button
            onClick={() => startTransition(async () => void (await deleteComment(family.id, postId, comment.id)))}
            className="hover:text-ink"
          >
            Delete
          </button>
        </span>
      )}
    </p>
  );
}

// Edit, delete and copy-link, for the "…" button.
function PostMenu({ post, leavingPage }: { post: Post; leavingPage: boolean }) {
  const { family, href } = useFamily();
  const { editPost } = useComposer();
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string>();
  const [deleting, startDeleting] = useTransition();
  useDismiss(ref, open, () => setOpen(false));

  const item = "flex h-11 w-full items-center gap-3 px-4 text-left text-[15px] hover:bg-hover";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="More"
        aria-expanded={open}
        className="-mr-2 flex h-9 w-9 items-center justify-center rounded-full text-ink-3 hover:bg-hover"
      >
        <MoreIcon size={20} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-52 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-pop">
          {post.canEdit && (
            <button
              className={item}
              onClick={() => {
                setOpen(false);
                editPost(post);
              }}
            >
              <PencilIcon size={18} /> Edit post
            </button>
          )}
          <button
            className={item}
            onClick={() => {
              navigator.clipboard?.writeText(`${location.origin}${href(`/posts/${post.id}`)}`);
              setCopied(true);
              setTimeout(() => setOpen(false), 700);
            }}
          >
            <LinkIcon size={18} /> {copied ? "Link copied" : "Copy link"}
          </button>
          {post.canDelete && (
            <button
              className={`${item} text-danger`}
              onClick={() => {
                setOpen(false);
                setConfirming(true);
              }}
            >
              <TrashIcon size={18} /> Delete post
            </button>
          )}
        </div>
      )}
      {confirming && (
        <ConfirmSheet
          title="Delete this post?"
          body="Its photos, reactions and comments go with it. This can't be undone."
          confirm="Delete post"
          pending={deleting}
          error={error}
          onClose={() => setConfirming(false)}
          onConfirm={() =>
            startDeleting(async () => {
              const result = await deletePost(family.id, post.id, leavingPage);
              if (!result.ok) setError(result.error);
              else setConfirming(false);
            })
          }
        />
      )}
    </div>
  );
}

function PostPhoto({
  photo,
  className,
  sizes,
  style,
}: {
  photo: Photo;
  className: string;
  sizes: string;
  style?: React.CSSProperties;
}) {
  return (
    <Image
      src={photo.src}
      alt={photo.alt}
      width={photo.width}
      height={photo.height}
      sizes={sizes}
      unoptimized={photo.src.startsWith("blob:")}
      draggable={false}
      style={style}
      className={`bg-sunken object-cover ${className}`}
    />
  );
}

function EventOverlay({ post, eventLine }: { post: Post; eventLine: string }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 via-black/25 to-transparent px-5 pb-5 pt-20 text-white">
      <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-white/80">{eventLine}</div>
      <div className="display mt-1.5 text-[30px] [text-wrap:balance]">{post.lifeEvent!.title}</div>
    </div>
  );
}

function Media({ post, photos, eventLine }: { post: Post; photos: Photo[]; eventLine: string }) {
  if (photos.length === 1) {
    const [photo] = photos;
    // Shown in the shape it was cropped to, kept between tall portrait (4:5) and wide landscape (1.91:1)
    const ratio = Math.min(1.91, Math.max(0.8, photo.width / photo.height));
    return (
      <div className="px-4 pt-3">
        <div className="relative overflow-hidden rounded-[14px]">
          <PostPhoto
            photo={photo}
            sizes="(min-width: 640px) 568px, 100vw"
            className="w-full"
            style={{ aspectRatio: ratio }}
          />
          {post.lifeEvent && <EventOverlay post={post} eventLine={eventLine} />}
        </div>
      </div>
    );
  }

  // Several photos: a swipeable row that shows the next one peeking in.
  return (
    <div className="no-scrollbar mt-3 flex snap-x snap-mandatory gap-2 overflow-x-auto scroll-px-4 px-4">
      {photos.map((photo, i) => (
        <div
          key={photo.mediaId ?? photo.src}
          className="relative w-[82%] shrink-0 snap-start overflow-hidden rounded-[14px] sm:w-[76%]"
        >
          <PostPhoto photo={photo} sizes="(min-width: 640px) 440px, 82vw" className="aspect-[4/5] w-full" />
          {i === 0 && post.lifeEvent && <EventOverlay post={post} eventLine={eventLine} />}
          <span className="absolute right-3 top-3 rounded-full bg-black/55 px-2 py-0.5 text-[12px] font-medium text-white">
            {i + 1}/{photos.length}
          </span>
        </div>
      ))}
    </div>
  );
}
