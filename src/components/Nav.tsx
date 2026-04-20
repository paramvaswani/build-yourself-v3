"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/protocol", label: "Protocol" },
  { href: "/coach", label: "Coach" },
  { href: "/weekly", label: "Weekly" },
  { href: "/commit", label: "Commit" },
  { href: "/settings", label: "Settings" },
];

function isActive(path: string, pathname: string) {
  if (path === "/") return pathname === "/";
  return pathname === path || pathname.startsWith(`${path}/`);
}

export function Nav() {
  const pathname = usePathname() || "/";
  return (
    <nav
      className="w-full border-b"
      style={{
        borderColor: "var(--border)",
        background: "var(--background)",
      }}
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-5 overflow-x-auto">
        {ITEMS.map((item) => {
          const active = isActive(item.href, pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="text-[11px] font-mono uppercase tracking-[0.2em] whitespace-nowrap transition-colors"
              style={{
                color: active ? "var(--accent)" : "var(--muted)",
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
