"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type TabKey = "saju" | "reading" | "matches" | "chat";

const TABS: ReadonlyArray<{
  key: TabKey;
  href: string;
  label: string;
  icon: string;
  match: (pathname: string) => boolean;
}> = [
  {
    key: "saju",
    href: "/saju",
    label: "사주",
    icon: "卦",
    match: (p) => p === "/saju",
  },
  {
    key: "reading",
    href: "/reading",
    label: "풀이",
    icon: "占",
    match: (p) => p === "/reading" || p === "/fortune",
  },
  {
    key: "matches",
    href: "/matches",
    label: "매칭",
    icon: "緣",
    match: (p) => p === "/matches" || p.startsWith("/matches/"),
  },
  {
    key: "chat",
    href: "/chat",
    label: "채팅",
    icon: "話",
    match: (p) => p === "/chat" || p.startsWith("/chat/"),
  },
];

export function BottomNav() {
  const pathname = usePathname();

  if (pathname === "/login") return null;

  return (
    <nav
      aria-label="주요 메뉴"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-hanji-200 bg-hanji-50/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex max-w-3xl items-stretch justify-between">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          return (
            <li key={tab.key} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={[
                  "flex flex-col items-center justify-center gap-1 py-2.5 transition-colors",
                  active
                    ? "text-vermilion-700"
                    : "text-ink-500 hover:text-ink-700",
                ].join(" ")}
              >
                <span
                  className={[
                    "font-serif text-lg leading-none",
                    active ? "" : "opacity-70",
                  ].join(" ")}
                  aria-hidden
                >
                  {tab.icon}
                </span>
                <span className="text-[11px] font-medium tracking-tight">
                  {tab.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
