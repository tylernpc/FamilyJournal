import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftIcon } from "@/components/icons";
import { PostCard } from "@/components/post-card";
import { toComment, toPost } from "@/lib/api/map";
import { api, isGuid, load } from "@/lib/server/api";
import { notFound } from "next/navigation";

export const metadata: Metadata = { title: "Post" };

export default async function PostPage({ params }: { params: Promise<{ familyId: string; postId: string }> }) {
  const { familyId, postId } = await params;
  if (!isGuid(postId)) notFound();
  const path = { params: { path: { familyId, postId } } };
  const [post, comments] = await Promise.all([
    load(api.GET("/api/families/{familyId}/posts/{postId}", path)),
    load(api.GET("/api/families/{familyId}/posts/{postId}/comments", path)),
  ]);

  // Every comment, not just the latest few
  const full = { ...toPost(post), comments: comments.map(toComment), commentCount: comments.length };

  return (
    <div className="mx-auto w-full max-w-[600px] pb-10 pt-2 lg:pt-6">
      <Link
        href={`/f/${familyId}`}
        className="ml-2 inline-flex h-10 items-center gap-1.5 rounded-full px-2 text-[15px] text-ink-2 hover:text-ink"
      >
        <ArrowLeftIcon size={18} />
        Journal
      </Link>
      <PostCard post={full} full />
    </div>
  );
}
