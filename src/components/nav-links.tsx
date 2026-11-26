"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home } from "lucide-react";

export function NavLinks() {
  const pathname = usePathname();

  const isHome = pathname === "/";
  const isGames = pathname === "/games" || pathname.startsWith("/games/");
  const isBoards = pathname.startsWith("/leaderboard");

  const baseClass =
    "inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 font-mono text-[10.5px] font-medium tracking-[0.14em] uppercase transition-colors sm:px-3.5 sm:text-[11px] sm:tracking-[0.2em]";

  const stateClass = (active: boolean) =>
    active
      ? "bg-white/[0.08] text-[#E8A849]"
      : "text-[#8E98AA] hover:bg-white/[0.05] hover:text-[#F4F1EA]";

  return (
    <>
      <Link
        href="/"
        aria-current={isHome ? "page" : undefined}
        className={`${baseClass} ${stateClass(isHome)}`}
      >
        <Home className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className="hidden sm:inline">Main Menu</span>
        <span className="sm:hidden">Home</span>
      </Link>
      <Link
        href="/games"
        aria-current={isGames ? "page" : undefined}
        className={`${baseClass} ${stateClass(isGames)}`}
      >
        Games
      </Link>
      <Link
        href="/leaderboard/higher-or-lower"
        aria-current={isBoards ? "page" : undefined}
        className={`hidden min-h-9 items-center rounded-lg px-3.5 font-mono text-[11px] font-medium tracking-[0.2em] uppercase transition-colors sm:inline-flex ${stateClass(
          isBoards
        )}`}
      >
        Boards
      </Link>
    </>
  );
}
