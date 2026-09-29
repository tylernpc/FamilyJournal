"use client";

import { useActionState, useState } from "react";
import { FormError, SubmitButton } from "@/components/form";
import { acceptInvite } from "./actions";

type Option = { id: string; name: string; detail?: string };

export function JoinForm({
  token,
  profile,
  claimable,
}: {
  token: string;
  profile?: { id: string; name: string };
  claimable: Option[];
}) {
  const [state, action] = useActionState(acceptInvite.bind(null, token), {});
  const [claim, setClaim] = useState("");

  return (
    <form action={action} className="mt-8 space-y-5">
      {!profile && claimable.length > 0 && (
        <fieldset>
          <legend className="text-[14px] font-semibold">Are you already in the tree?</legend>
          <p className="mt-0.5 text-[13px] text-ink-3">
            If someone added you, pick your profile to keep what&apos;s been shared about you.
          </p>
          <div className="mt-2 divide-y divide-line rounded-lg border border-line">
            {[{ id: "", name: "No, start a new profile" } as Option, ...claimable].map((option) => (
              <label key={option.id || "new"} className="flex min-h-12 cursor-pointer items-center gap-3 px-3.5 py-2 text-[15px]">
                <input
                  type="radio"
                  name="claimProfileId"
                  value={option.id}
                  checked={claim === option.id}
                  onChange={() => setClaim(option.id)}
                  className="h-4 w-4 accent-[var(--ink)]"
                />
                <span className="flex-1">
                  {option.id ? `Yes, I'm ${option.name}` : option.name}
                  {option.detail && <span className="block text-[13px] text-ink-3">{option.detail}</span>}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <FormError>{state.error}</FormError>
      <SubmitButton pending="Joining…">{profile ? `Yes, I'm ${profile.name.split(" ")[0]}` : "Join"}</SubmitButton>
    </form>
  );
}
