import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60dvh] w-full max-w-[400px] flex-col justify-center px-4 py-16">
      <h1 className="display text-[40px]">Not here</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
        This page doesn&apos;t exist, or it belongs to a family you&apos;re not part of.
      </p>
      <Link
        href="/"
        className="mt-6 flex h-12 items-center justify-center rounded-full bg-ink text-[15px] font-semibold text-canvas hover:bg-accent-hover"
      >
        Back to your journal
      </Link>
    </div>
  );
}
