import { NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { isGameSlug } from "@/lib/constants";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  if (!isGameSlug(slug)) {
    return NextResponse.json({ error: "Unknown game." }, { status: 404 });
  }

  const player = await getCurrentPlayer();
  if (!player) {
    return NextResponse.json({ rank: null, signedIn: false });
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ rank: null, signedIn: true });
  }

  const url = new URL(request.url);
  const country = url.searchParams.get("country")?.toUpperCase() || null;

  const admin = createSupabaseAdminClient();
  const { data } = await admin.rpc("get_player_rank", {
    p_game_slug: slug,
    p_user_id: player.id,
    p_country_code: country && /^[A-Z]{2}$/.test(country) ? country : null,
  });

  const row = data?.[0] as
    | {
        rank: number;
        total_players: number;
        best_score: number;
        plays: number;
        achieved_at: string;
      }
    | undefined;

  if (!row) {
    return NextResponse.json({
      signedIn: true,
      username: player.username,
      usernameDisplay: player.usernameDisplay,
      countryCode: player.countryCode,
      countryName: player.countryName,
      rank: null,
    });
  }

  return NextResponse.json({
    signedIn: true,
    username: player.username,
    usernameDisplay: player.usernameDisplay,
    countryCode: player.countryCode,
    countryName: player.countryName,
    rank: Number(row.rank),
    totalPlayers: Number(row.total_players),
    bestScore: Number(row.best_score),
    plays: row.plays,
    achievedAt: row.achieved_at,
  });
}
