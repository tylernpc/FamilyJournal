"use client";

import { useFormStatus } from "react-dom";

export const inputClass =
  "h-11 w-full rounded-lg bg-sunken px-3.5 text-[16px] text-ink outline-none placeholder:text-ink-3 focus:ring-2 focus:ring-ink";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-semibold">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-[13px] text-ink-3">{hint}</span>}
    </label>
  );
}

export function TextField({
  label,
  hint,
  ...input
}: { label: string; hint?: React.ReactNode } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Field label={label} hint={hint}>
      <input {...input} className={inputClass} />
    </Field>
  );
}

// Disabled with a working label while its form's action runs.
export function SubmitButton({
  children,
  pending: pendingLabel,
  className = "",
}: {
  children: React.ReactNode;
  pending: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`h-12 w-full rounded-full bg-ink text-[15px] font-semibold text-canvas hover:bg-accent-hover disabled:opacity-40 ${className}`}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

export function FormError({ children }: { children?: string }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-lg bg-sunken px-3.5 py-2.5 text-[14px] text-danger">
      {children}
    </p>
  );
}
