"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CURRENT_USER_ID } from "@/lib/data";
import { useStore } from "@/lib/store";
import { Avatar } from "./avatar";
import { ComposerHost } from "./composer";
import { BellIcon, HomeIcon, PeopleIcon, PlusIcon, TreeIcon } from "./icons";

const NAV = [
  { href: "/", label: "Home", icon: HomeIcon },
  { href: "/tree", label: "Tree", icon: TreeIcon },
  { href: "/people", label: "People", icon: PeopleIcon },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/people") return pathname === "/people" || (pathname.startsWith("/people/") && !pathname.endsWith(`/${CURRENT_USER_ID}`));
  return pathname.startsWith(href);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { unreadCount, openComposer } = useStore();
  const onMe = pathname === `/people/${CURRENT_USER_ID}`;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1200px] items-center gap-6 px-4 lg:h-16 lg:px-6">
          <Link href="/" className="display text-[26px] lg:text-[28px]">
            Harlow
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
            {NAV.map(({ href, label }) => {
              const active = isActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-full px-3.5 py-1.5 text-[15px] ${
                    active ? "bg-sunken font-semibold text-ink" : "text-ink-2 hover:text-ink"
                  }`}
                >
                  {label === "Home" ? "Journal" : label === "Tree" ? "Family tree" : label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-1 lg:gap-2">
            <button
              onClick={() => openComposer()}
              className="hidden h-9 items-center gap-1.5 rounded-full bg-ink pl-3 pr-4 text-[14px] font-semibold text-canvas hover:bg-accent-hover lg:flex"
            >
              <PlusIcon size={18} strokeWidth={2} />
              New post
            </button>
            <Link
              href="/notifications"
              aria-label={`Notifications${unreadCount ? `, ${unreadCount} new` : ""}`}
              className="relative flex h-10 w-10 items-center justify-center rounded-full hover:bg-hover"
            >
              <BellIcon size={23} />
              {unreadCount > 0 && (
                <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full border-2 border-canvas bg-signal" />
              )}
            </Link>
            <Link
              href={`/people/${CURRENT_USER_ID}`}
              aria-label="Your profile"
              className={`hidden rounded-full lg:block ${onMe ? "ring-2 ring-ink ring-offset-2 ring-offset-canvas" : ""}`}
            >
              <Avatar personId={CURRENT_USER_ID} size={32} />
            </Link>
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col pb-[calc(3.5rem+env(safe-area-inset-bottom))] lg:pb-0">
        {children}
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-canvas pb-[env(safe-area-inset-bottom)] lg:hidden"
        aria-label="Main"
      >
        {NAV.slice(0, 2).map((item) => (
          <TabLink key={item.href} {...item} active={isActive(pathname, item.href)} />
        ))}
        <button
          onClick={() => openComposer()}
          aria-label="New post"
          className="flex h-14 items-center justify-center"
        >
          <span className="flex h-9 w-12 items-center justify-center rounded-xl bg-ink text-canvas">
            <PlusIcon size={22} strokeWidth={2} />
          </span>
        </button>
        <TabLink {...NAV[2]} active={isActive(pathname, "/people")} />
        <Link
          href={`/people/${CURRENT_USER_ID}`}
          aria-label="Your profile"
          className="flex h-14 items-center justify-center"
        >
          <span className={`rounded-full ${onMe ? "ring-2 ring-ink ring-offset-2 ring-offset-canvas" : ""}`}>
            <Avatar personId={CURRENT_USER_ID} size={26} />
          </span>
        </Link>
      </nav>

      <ComposerHost />
    </div>
  );
}

function TabLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: typeof HomeIcon;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={`flex h-14 items-center justify-center ${active ? "text-ink" : "text-ink-3"}`}
    >
      <Icon size={25} strokeWidth={active ? 2 : 1.5} />
    </Link>
  );
}
