import type { Metadata } from "next";
import Link from "next/link";
import { safeNext } from "@/lib/server/session-cookies";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const next = safeNext((await searchParams).next);
  const signUp = next === "/" ? "/signup" : `/signup?next=${encodeURIComponent(next)}`;

  return (
    <>
      <h1 className="display text-[40px]">Sign in</h1>
      <p className="mt-2 text-[15px] text-ink-2">Your family&apos;s journal and tree, kept just between you.</p>
      <LoginForm next={next} />
      <p className="mt-8 text-center text-[14px] text-ink-2">
        New here?{" "}
        <Link href={signUp} className="font-semibold text-ink underline underline-offset-4">
          Create an account
        </Link>
      </p>
    </>
  );
}
