import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ProfileClient, type ProfileScoreRow } from "@/components/profile-client";
import { getCurrentPlayer } from "@/lib/auth";
import { isGameSlug } from "@/lib/constants";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/server";

export const metadata = {
  title: "My Profile",
  description: "View your personal bests, global ranks, and account settings.",
};

export default async function ProfilePage() {
  const player = await getCurrentPlayer();
  if (!player) {
    redirect("/join?mode=returning");
  }

  const scoresMap: Record<string, ProfileScoreRow> = {};

  if (isSupabaseAdminConfigured()) {
    const admin = createSupabaseAdminClient();
    const { data: scoreRows } = await admin
      .from("scores")
      .select("game_slug, best_score, plays")
      .eq("user_id", player.id);

    const validRows = (scoreRows || []).filter((r) => isGameSlug(r.game_slug));
    await Promise.all(
      validRows.map(async (row) => {
        if (!isGameSlug(row.game_slug)) return;
        const { data: rankData } = await admin.rpc("get_player_rank", {
          p_game_slug: row.game_slug,
          p_user_id: player.id,
          p_country_code: null,
        });
        const rankRow = rankData?.[0] as
          | { rank: number; total_players: number }
          | undefined;

        scoresMap[row.game_slug] = {
          slug: row.game_slug,
          bestScore: Number(row.best_score),
          plays: row.plays,
          rank: rankRow ? Number(rankRow.rank) : null,
          totalPlayers: rankRow ? Number(rankRow.total_players) : null,
        };
      })
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        <ProfileClient
          player={{
            username: player.username,
            usernameDisplay: player.usernameDisplay,
            countryCode: player.countryCode,
            countryName: player.countryName,
            createdAt: player.createdAt,
          }}
          scores={scoresMap}
        />
      </main>
      <SiteFooter />
    </div>
  );
}
