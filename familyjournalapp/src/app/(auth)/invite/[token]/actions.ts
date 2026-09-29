"use server";

import { redirect } from "next/navigation";
import { api, attempt, isGuid, unwrap } from "@/lib/server/api";

export async function acceptInvite(
  token: string,
  _: { error?: string },
  form: FormData,
): Promise<{ error?: string }> {
  const claim = form.get("claimProfileId");
  const result = await attempt(() =>
    unwrap(
      api.POST("/api/invites/{token}/accept", {
        params: { path: { token } },
        body: { claimProfileId: isGuid(claim) ? claim : null },
      }),
    ),
  );
  if (!result.ok) return { error: result.error };
  redirect(`/f/${result.data.familyId}`);
}
