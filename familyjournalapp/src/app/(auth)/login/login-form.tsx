"use client";

import { useActionState } from "react";
import { FormError, SubmitButton, TextField } from "@/components/form";
import { signIn } from "../actions";

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState(signIn, {});

  return (
    <form action={action} className="mt-8 space-y-4">
      <input type="hidden" name="next" value={next} />
      <TextField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        autoFocus
        required
        defaultValue={state.values?.email}
      />
      <TextField label="Password" name="password" type="password" autoComplete="current-password" required />
      <FormError>{state.error}</FormError>
      <SubmitButton pending="Signing in…" className="!mt-6">
        Sign in
      </SubmitButton>
    </form>
  );
}
