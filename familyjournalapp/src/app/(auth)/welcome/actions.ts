"use server";

import { redirect } from "next/navigation";
import { api, attempt, unwrap } from "@/lib/server/api";

type State = { error?: string; name?: string };

export async function createFamily(_: State, form: FormData): Promise<State> {
  const name = String(form.get("name") ?? "").trim();
  if (!name) return { error: "Give your family journal a name.", name };

  const result = await attempt(() => unwrap(api.POST("/api/families", { body: { name } })));
  if (!result.ok) return { error: result.error, name };
  redirect(`/f/${result.data.id}`);
}
