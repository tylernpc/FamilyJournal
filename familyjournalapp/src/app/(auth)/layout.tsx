import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col px-4 pt-[env(safe-area-inset-top)]">
      <header className="mx-auto flex h-14 w-full max-w-[400px] items-center lg:h-16">
        <Link href="/" className="display text-[26px] lg:text-[28px]">
          Family Journal
        </Link>
      </header>
      <main className="mx-auto w-full max-w-[400px] flex-1 pb-16 pt-8 lg:pt-14">{children}</main>
    </div>
  );
}
