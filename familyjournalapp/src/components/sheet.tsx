"use client";

import { useEffect, useRef } from "react";
import { useDismiss } from "@/lib/use-dismiss";

// Bottom sheet on phones, centered dialog on larger screens.
export function Sheet({
  label,
  onClose,
  children,
  wide = false,
}: {
  label: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(ref, true, onClose);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-6">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={`flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-surface pb-[env(safe-area-inset-bottom)] shadow-pop sm:max-h-[86dvh] sm:rounded-2xl sm:pb-0 ${
          wide ? "sm:max-w-[600px]" : "sm:max-w-[440px]"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

export function SheetHeader({
  title,
  left,
  right,
}: {
  title: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="grid h-14 shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b border-line px-4">
      <div className="justify-self-start">{left}</div>
      <h2 className="text-[16px] font-semibold">{title}</h2>
      <div className="justify-self-end">{right}</div>
    </div>
  );
}
