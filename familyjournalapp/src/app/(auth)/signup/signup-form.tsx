"use client";

import { useActionState } from "react";
import { FormError, SubmitButton, TextField } from "@/components/form";
import { signUp } from "../actions";

export function SignupForm({ next }: { next: string }) {
  const [state, action] = useActionState(signUp, {});

  return (
    <form action={action} className="mt-8 space-y-4">
      <input type="hidden" name="next" value={next} />
      <div className="grid grid-cols-2 gap-3">
        <TextField
          label="First name"
          name="firstName"
          autoComplete="given-name"
          autoFocus
          required
          maxLength={100}
          defaultValue={state.values?.firstName}
        />
        <TextField
          label="Last name"
          name="lastName"
          autoComplete="family-name"
          required
          maxLength={100}
          defaultValue={state.values?.lastName}
        />
      </div>
      <TextField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        maxLength={320}
        defaultValue={state.values?.email}
      />
      <TextField
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={10}
        maxLength={128}
        hint="At least 10 characters. A short phrase is easier to remember."
      />
      <FormError>{state.error}</FormError>
      <SubmitButton pending="Creating your account…" className="!mt-6">
        Create account
      </SubmitButton>
    </form>
  );
}
