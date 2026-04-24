"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Map, Search, SlidersHorizontal, TableProperties, Download, Compass, KanbanSquare } from "lucide-react";
import { clsx } from "clsx";
import { ThemeToggle } from "@/components/ThemeToggle";

const items = [
  { href: "/", label: "Dashboard", icon: Compass },
  { href: "/onboarding", label: "Profile", icon: SlidersHorizontal },
  { href: "/schools", label: "Explorer", icon: Map },
  { href: "/compare", label: "Compare", icon: TableProperties },
  { href: "/tracker", label: "Tracker", icon: KanbanSquare },
  { href: "/discover", label: "Research", icon: Search },
  { href: "/export", label: "Export", icon: Download },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3">
        <div>
          <Link href="/" className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-100">
            Med School List Builder
          </Link>
          <p className="mt-1 text-xs text-slate-400">
            Research-dense planning for fit, cost, family life, and location.
          </p>
        </div>
        <nav className="flex flex-wrap items-center gap-2">
          {items.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition",
                  active
                    ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-200"
                    : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10 hover:text-white",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}

