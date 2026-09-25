"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CURRENT_USER_ID, family, people } from "@/lib/data";
import { fullName, getPerson } from "@/lib/family";
import { useStore } from "@/lib/store";
import { Avatar } from "./avatar";
import { BellIcon, FeedIcon, PeopleIcon, TreeIcon } from "./icons";

const NAV = [
  { href: "/", label: "Feed", icon: FeedIcon },
  { href: "/tree", label: "Family tree", icon: TreeIcon },
  { href: "/people", label: "People", icon: PeopleIcon },
  { href: "/notifications", label: "Notifications", icon: BellIcon },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { unreadCount } = useStore();
  const me = getPerson(CURRENT_USER_ID);

  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-surface lg:flex">
        <div className="flex items-center gap-3 px-5 pb-5 pt-6">
          <FamilyMark />
          <div className="min-w-0">
            <div className="truncate text-[15px] font-semibold leading-tight">{family.name}</div>
            <div className="text-[13px] text-ink-3">{people.length} people</div>
          </div>
        </div>

        <nav className="flex flex-col gap-px px-3" aria-label="Main">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex h-9 items-center gap-3 rounded-md px-2.5 text-[14px] transition-colors ${
                  active
                    ? "bg-sunken font-medium text-ink"
                    : "text-ink-2 hover:bg-hover hover:text-ink"
                }`}
              >
                <Icon size={18} className={active ? "text-ink" : "text-ink-3"} />
                <span className="flex-1">{label}</span>
                {href === "/notifications" && unreadCount > 0 && (
                  <span className="min-w-5 rounded-full bg-accent px-1.5 text-center text-[11px] font-semibold leading-5 text-surface">
                    {unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-line p-3">
          <Link
            href={`/people/${me.id}`}
            className="flex items-center gap-3 rounded-md p-2 hover:bg-hover"
          >
            <Avatar personId={me.id} size={32} />
            <div className="min-w-0 leading-tight">
              <div className="truncate text-[14px] font-medium">{fullName(me)}</div>
              <div className="text-[12px] text-ink-3">Family admin</div>
            </div>
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-[calc(3.5rem+env(safe-area-inset-top))] items-center gap-3 border-b border-line bg-surface/95 px-4 pt-[env(safe-area-inset-top)] backdrop-blur lg:hidden">
          <FamilyMark small />
          <span className="font-semibold">{family.name}</span>
          <Link href={`/people/${me.id}`} className="ml-auto">
            <Avatar personId={me.id} size={30} />
          </Link>
        </header>

        <main className="flex-1 pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">{children}</main>

        <nav
          className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
          aria-label="Main"
        >
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`relative flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] ${
                  active ? "text-ink" : "text-ink-3"
                }`}
              >
                <Icon size={20} />
                {label === "Family tree" ? "Tree" : label}
                {href === "/notifications" && unreadCount > 0 && (
                  <span className="absolute left-1/2 top-2 ml-1.5 h-2 w-2 rounded-full bg-accent" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

function FamilyMark({ small = false }: { small?: boolean }) {
  const size = small ? 28 : 36;
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-lg border border-line bg-accent-soft font-serif text-accent-ink"
      style={{ width: size, height: size, fontSize: small ? 16 : 20 }}
      aria-hidden="true"
    >
      H
    </span>
  );
}
