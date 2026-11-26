import Link from "next/link";
import { getCurrentPlayer } from "@/lib/auth";
import { SITE_NAME } from "@/lib/constants";
import { CountryFlag } from "./ui/flag";
import { Shield } from "lucide-react";

export async function SiteHeader() {
  const player = await getCurrentPlayer();

  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.07] bg-[#04060A]/92 md:bg-[#04060A]/75 md:backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-3 sm:h-16 sm:px-6">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2.5 py-1 transition-opacity hover:opacity-85"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icon-192.png"
            alt=""
            width={28}
            height={28}
            className="h-7 w-7 shrink-0 rounded-lg object-contain"
          />
          <span className="truncate font-heading text-[11px] font-semibold tracking-[0.16em] text-[#F4F1EA] uppercase sm:text-[13px] sm:tracking-[0.26em]">
            <span className="sm:hidden">World Arcade</span>
            <span className="hidden sm:inline">{SITE_NAME}</span>
          </span>
        </Link>

        <nav aria-label="Main navigation" className="flex shrink-0 items-center gap-1 sm:gap-2">
          <Link
            href="/games"
            className="inline-flex min-h-9 items-center rounded-lg px-2.5 font-mono text-[10.5px] font-medium tracking-[0.16em] text-[#8E98AA] uppercase transition-colors hover:bg-white/[0.05] hover:text-[#F4F1EA] sm:px-3.5 sm:text-[11px] sm:tracking-[0.2em]"
          >
            Games
          </Link>
          <Link
            href="/leaderboard/higher-or-lower"
            className="hidden min-h-9 items-center rounded-lg px-3.5 font-mono text-[11px] font-medium tracking-[0.2em] text-[#8E98AA] uppercase transition-colors hover:bg-white/[0.05] hover:text-[#F4F1EA] sm:inline-flex"
          >
            Boards
          </Link>

          {player ? (
            <div className="ml-1 flex items-center gap-1.5 sm:ml-2 sm:gap-2">
              {player.isAdmin && (
                <Link
                  href="/admin"
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 font-mono text-[10.5px] tracking-[0.14em] text-[#F4F1EA] uppercase hover:border-[#E8A849]/45"
                >
                  <Shield className="h-3.5 w-3.5 text-[#E8A849]" aria-hidden="true" />
                  <span className="hidden md:inline">Admin</span>
                </Link>
              )}
              <Link
                href="/me"
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-white/12 bg-white/[0.05] px-2.5 py-1 text-[12px] font-medium text-[#F4F1EA] transition-all hover:border-[#E8A849]/50 sm:gap-2 sm:px-3"
              >
                <CountryFlag code={player.countryCode} label={player.countryName} className="h-3.5 w-5" />
                <span className="max-w-[78px] truncate sm:max-w-[110px]">
                  {player.usernameDisplay}
                </span>
              </Link>
            </div>
          ) : (
            <div className="ml-1 flex items-center gap-1.5 sm:ml-2 sm:gap-2">
              <Link
                href="/join?mode=returning"
                className="hidden min-h-9 items-center rounded-lg px-3.5 font-mono text-[11px] font-medium tracking-[0.2em] text-[#8E98AA] uppercase transition-colors hover:text-[#F4F1EA] sm:inline-flex"
              >
                Sign In
              </Link>
              <Link
                href="/join?mode=new"
                className="arcade-btn arcade-btn-primary inline-flex min-h-9 items-center rounded-lg px-3.5 text-[10.5px] sm:px-4 sm:text-[11px]"
              >
                Join
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
