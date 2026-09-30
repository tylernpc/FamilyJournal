"use client";

// Shown when a page can't load its data, usually because the API is unreachable for a moment.
export default function FamilyError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className="mx-auto w-full max-w-[400px] px-4 py-16">
      <h1 className="display text-[32px]">Couldn&apos;t load this</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
        Family Journal didn&apos;t answer in time. Check your connection, then try again.
      </p>
      <button
        onClick={() => retry()}
        className="mt-6 h-12 w-full rounded-full bg-ink text-[15px] font-semibold text-canvas hover:bg-accent-hover"
      >
        Try again
      </button>
    </div>
  );
}
