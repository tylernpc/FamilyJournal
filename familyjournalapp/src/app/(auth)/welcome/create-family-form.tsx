"use client";

import { useActionState } from "react";
import { FormError, SubmitButton, TextField } from "@/components/form";
import { createFamily } from "./actions";

export function CreateFamilyForm({ suggestion }: { suggestion: string }) {
  const [state, action] = useActionState(createFamily, {});

  return (
    <form action={action} className="mt-8 space-y-4">
      <TextField
        label="Family name"
        name="name"
        required
        maxLength={200}
        autoFocus
        defaultValue={state.name ?? suggestion}
        hint="Only people you invite can see anything in it."
      />
      <FormError>{state.error}</FormError>
      <SubmitButton pending="Setting it up…" className="!mt-6">
        Start the journal
      </SubmitButton>
    </form>
  );
}
