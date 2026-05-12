"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "urql";
import { graphql } from "@/gql";

const ME_DISPLAY_NAME_QUERY = graphql(`
  query MeDisplayName {
    me {
      id
      displayName
    }
  }
`);

export function UserMenu({
  email,
  signOutAction,
}: {
  email: string | null;
  signOutAction: () => Promise<void>;
}) {
  const [{ data }] = useQuery({
    query: ME_DISPLAY_NAME_QUERY,
    requestPolicy: "cache-and-network",
  });
  const name = data?.me?.displayName ?? "사용자";
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  if (pathname === "/login") return null;

  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <div
      ref={ref}
      className="fixed right-3 top-3 z-40"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <button
        type="button"
        aria-label="사용자 메뉴"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-hanji-200 bg-hanji-50/95 text-sm font-semibold text-ink-700 backdrop-blur-sm shadow-sm hover:bg-white transition-colors"
      >
        {initial}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-11 w-56 overflow-hidden rounded-lg border border-ink-200 bg-white shadow-lg"
        >
          <div className="border-b border-ink-100 px-4 py-3">
            <p className="m-0 font-serif text-sm text-ink-900">{name}</p>
            {email && (
              <p className="m-0 mt-0.5 truncate text-[11px] text-ink-400">
                {email}
              </p>
            )}
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              role="menuitem"
              className="w-full px-4 py-2.5 text-left text-sm text-ink-700 hover:bg-hanji-50 transition-colors"
            >
              로그아웃
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
