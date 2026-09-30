import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { toPhoto } from "@/lib/api/map";
import { frame } from "@/lib/photo";
import { ApiError, api, unwrap } from "@/lib/server/api";
import { ACCESS_COOKIE } from "@/lib/server/session-cookies";
import { JoinForm } from "./join-form";

export const metadata: Metadata = { title: "You're invited" };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let preview;
  try {
    preview = await unwrap(api.GET("/api/invites/{token}", { params: { path: { token } } }));
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    return (
      <>
        <h1 className="display text-[40px]">This link has expired</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
          {error.status === 404
            ? "Invite links work once and last two weeks. Ask whoever invited you to send a new one."
            : error.message}
        </p>
      </>
    );
  }

  const signedIn = (await cookies()).has(ACCESS_COOKIE);
  const here = `/invite/${encodeURIComponent(token)}`;
  const profile = preview.profile;
  const portrait = profile?.photo && frame(toPhoto(profile.photo), "portrait");

  return (
    <>
      {portrait && (
        <Image
          src={portrait.src}
          alt=""
          width={120}
          height={156}
          className="mb-6 aspect-[10/13] w-[120px] rounded-[4px] bg-sunken object-cover"
        />
      )}
      <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-3">
        {preview.invitedByName ? `${preview.invitedByName} invited you` : "You're invited"}
      </p>
      <h1 className="display mt-2 text-[40px] [text-wrap:balance]">Join the {preview.familyName}</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
        {profile
          ? `${profile.firstName} ${profile.lastName} is already in the family tree. Joining makes that profile yours, with every post you've been tagged in.`
          : "A private journal and family tree, just for your family."}
      </p>

      {signedIn ? (
        <JoinForm
          token={token}
          profile={profile ? { id: profile.id, name: `${profile.firstName} ${profile.lastName}` } : undefined}
          claimable={preview.claimableProfiles.map((p) => ({
            id: p.id,
            name: `${p.firstName} ${p.lastName}`,
            detail: p.birthYear ? `Born ${p.birthYear}` : undefined,
          }))}
        />
      ) : (
        <div className="mt-8 space-y-3">
          <Link
            href={`/signup?next=${encodeURIComponent(here)}`}
            className="flex h-12 items-center justify-center rounded-full bg-ink text-[15px] font-semibold text-canvas hover:bg-accent-hover"
          >
            Create an account
          </Link>
          <Link
            href={`/login?next=${encodeURIComponent(here)}`}
            className="flex h-12 items-center justify-center rounded-full border border-ink text-[15px] font-semibold hover:bg-hover"
          >
            I already have one
          </Link>
        </div>
      )}
    </>
  );
}
