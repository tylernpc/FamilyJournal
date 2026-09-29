import type { Metadata } from "next";
import Link from "next/link";
import { getAccount } from "@/lib/server/family";
import { CreateFamilyForm } from "./create-family-form";

export const metadata: Metadata = { title: "Start your family" };

export default async function WelcomePage() {
  const account = await getAccount();

  return (
    <>
      <h1 className="display text-[40px]">Welcome, {account.firstName}</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
        Start your family&apos;s journal. You can add relatives to the tree right away, then invite them
        when you&apos;re ready.
      </p>
      <CreateFamilyForm suggestion={`${account.lastName} Family`} />
      <p className="mt-8 text-[14px] leading-relaxed text-ink-3">
        Someone already started one for your family? Open the invite link they sent you to join it.
      </p>
      {account.families.length > 0 && (
        <div className="mt-8 border-t border-line pt-6">
          <h2 className="text-[13px] font-semibold">Your families</h2>
          <ul className="mt-2 space-y-1">
            {account.families.map((f) => (
              <li key={f.familyId}>
                <Link href={`/f/${f.familyId}`} className="text-[15px] underline underline-offset-4">
                  {f.familyName}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
