import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-4 py-20 text-center">
        <p className="cinema-kicker text-[#E8A849]">404 · Off The Grid</p>
        <h1 className="cinema-headline mt-3 font-heading text-4xl font-semibold uppercase sm:text-5xl">
          Page Not Found
        </h1>
        <p className="mt-3 text-sm text-[#9AA3B2] sm:text-base">
          That game, board, or player card doesn&apos;t exist.
        </p>
        <Link
          href="/games"
          className="arcade-btn arcade-btn-primary mt-8 inline-flex min-h-12 items-center gap-2 rounded-xl px-7 text-xs"
        >
          Explore All 9 Games
          <ArrowRight className="h-4 w-4" />
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}
