import Link from "next/link";
import { SITE_NAME } from "@/lib/constants";

export function SiteFooter() {
  return (
    <footer className="mt-28 border-t border-white/[0.07]">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-4 py-10 text-xs text-[#7D8798] sm:flex-row sm:px-6">
        <p className="font-mono tracking-[0.2em] text-[#F4F1EA]/75 uppercase">
          {SITE_NAME}
        </p>
        <div className="flex flex-wrap items-center gap-6">
          <Link href="/games" className="transition-colors hover:text-[#E8A849]">
            Games
          </Link>
          <Link href="/leaderboard/higher-or-lower" className="transition-colors hover:text-[#E8A849]">
            Leaderboards
          </Link>
          <Link href="/join" className="transition-colors hover:text-[#E8A849]">
            Join
          </Link>
          <Link href="/privacy" className="transition-colors hover:text-[#E8A849]">
            Privacy
          </Link>
        </div>
      </div>
    </footer>
  );
}
