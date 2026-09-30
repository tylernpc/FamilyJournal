import type { Metadata } from "next";
import Link from "next/link";
import { safeNext } from "@/lib/server/session-cookies";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Create an account" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const next = safeNext((await searchParams).next);
  const joining = next.startsWith("/invite/");
  const signIn = next === "/" ? "/login" : `/login?next=${encodeURIComponent(next)}`;

  return (
    <>
      <h1 className="display text-[40px]">{joining ? "Join your family" : "Start your family journal"}</h1>
      <p className="mt-2 text-[15px] text-ink-2">
        {joining
          ? "Create an account, then you'll pick up right where the invite left off."
          : "A private place for your family's updates, photos and tree."}
      </p>
      <SignupForm next={next} />
      <p className="mt-8 text-center text-[14px] text-ink-2">
        Already have an account?{" "}
        <Link href={signIn} className="font-semibold text-ink underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </>
  );
}
