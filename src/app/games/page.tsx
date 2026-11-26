import Link from "next/link";
import { ArrowRight, Trophy } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { GameAsset } from "@/components/game-asset";
import { GAMES, SITE_NAME } from "@/lib/constants";
import { getCurrentPlayer } from "@/lib/auth";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/server";
import { formatScore } from "@/lib/utils";

export const metadata = {
  title: "All 9 Arcade Games",
  description: `Play all 9 games on ${SITE_NAME} and climb the global leaderboards.`,
};

export default async function GamesPage() {
  const player = await getCurrentPlayer();

  const personalBests: Record<string, number> = {};
  if (player && isSupabaseAdminConfigured()) {
    const admin = createSupabaseAdminClient();
    const { data } = await admin
      .from("scores")
      .select("game_slug, best_score")
      .eq("user_id", player.id);
    for (const row of data || []) {
      personalBests[row.game_slug] = Number(row.best_score);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
        <div className="mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="cinema-kicker text-[#E8A849]">
              9 Games · 9 Uncapped Global Boards
            </p>
            <h1 className="cinema-headline mt-2 font-heading text-4xl font-bold sm:text-5xl">
              Choose Your{" "}
              <span className="font-editorial cinema-amber-text">Challenge.</span>
            </h1>
          </div>
          {!player && (
            <Link
              href="/join?mode=new"
              className="arcade-btn arcade-btn-primary inline-flex min-h-11 items-center gap-2 rounded-full px-6 text-sm"
            >
              Join to Rank Worldwide
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {GAMES.map((game) => {
            const best = personalBests[game.slug];
            return (
              <div
                key={game.slug}
                className="apple-glass arcade-card-hover group relative flex flex-col justify-between overflow-hidden p-7"
              >
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full opacity-[0.16] blur-3xl transition-opacity duration-500 group-hover:opacity-[0.3]"
                  style={{ background: game.accent }}
                />

                <div>
                  <div className="flex items-start justify-between gap-3">
                    <GameAsset
                      src={game.assetPng}
                      alt={game.name}
                      accent={game.accent}
                      gradient={game.gradient}
                      isRotatingHue={game.isRotatingHue}
                      className="h-14 w-14 shrink-0 transition-transform duration-500 group-hover:scale-105"
                    />
                    <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 font-mono text-[10.5px] tracking-wider text-[#9AA3B2] uppercase">
                      {game.badge ||
                        (game.scoreDirection === "lower"
                          ? "Lowest wins"
                          : "Highest wins")}
                    </span>
                  </div>

                  <h2 className="mt-6 font-heading text-[22px] font-semibold text-[#F4F1EA]">
                    {game.name}
                  </h2>
                  <p className="mt-2 text-[14.5px] leading-relaxed text-[#9AA3B2]">
                    {game.shortDesc}
                  </p>
                </div>

                <div className="mt-7 space-y-3 border-t border-white/[0.07] pt-4">
                  {best !== undefined && (
                    <p className="font-score text-xs font-medium text-[#9AA3B2]">
                      Personal best:{" "}
                      <span className="font-semibold text-[#E8A849]">
                        {formatScore(game.slug, best)}
                      </span>
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/games/${game.slug}`}
                      className="arcade-btn arcade-btn-primary inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-full px-4 text-sm"
                    >
                      Play
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                    <Link
                      href={`/leaderboard/${game.slug}`}
                      aria-label={`${game.name} leaderboard`}
                      className="arcade-btn arcade-btn-secondary inline-flex min-h-10 items-center justify-center rounded-full px-3.5 text-sm"
                    >
                      <Trophy className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
