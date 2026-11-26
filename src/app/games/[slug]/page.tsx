import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { GameRunner } from "@/components/games/game-runner";
import { GAME_BY_SLUG, isGameSlug } from "@/lib/constants";
import { getCurrentPlayer } from "@/lib/auth";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!isGameSlug(slug)) return { title: "Game" };
  const game = GAME_BY_SLUG[slug];
  return {
    title: game.name,
    description: game.shortDesc,
  };
}

export default async function GamePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!isGameSlug(slug)) notFound();

  const player = await getCurrentPlayer();
  let initialPersonalBest: number | null = null;
  let initialRank: number | null = null;

  if (player && isSupabaseAdminConfigured()) {
    const admin = createSupabaseAdminClient();
    const { data } = await admin.rpc("get_player_rank", {
      p_game_slug: slug,
      p_user_id: player.id,
      p_country_code: null,
    });
    const row = data?.[0] as { rank: number; best_score: number } | undefined;
    if (row) {
      initialPersonalBest = Number(row.best_score);
      initialRank = Number(row.rank);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <GameRunner
          slug={slug}
          player={
            player
              ? {
                  id: player.id,
                  username: player.username,
                  usernameDisplay: player.usernameDisplay,
                  countryCode: player.countryCode,
                  countryName: player.countryName,
                }
              : null
          }
          initialPersonalBest={initialPersonalBest}
          initialRank={initialRank}
        />
      </main>
      <SiteFooter />
    </div>
  );
}
