import { ImageResponse } from "next/og";
import { GAME_BY_SLUG, isGameSlug, SITE_NAME } from "@/lib/constants";
import { formatScore } from "@/lib/utils";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const gameParam = searchParams.get("game") || "higher-or-lower";
  const usernameParam = (searchParams.get("username") || "").trim().toLowerCase();

  const slug = isGameSlug(gameParam) ? gameParam : "higher-or-lower";
  const game = GAME_BY_SLUG[slug];

  let usernameDisplay = usernameParam || "Player";
  let countryName = "Worldwide";
  let scoreText = "Unranked";
  let rankText = "—";

  if (usernameParam && isSupabaseAdminConfigured()) {
    const admin = createSupabaseAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("id, username_display, country_name, is_banned")
      .eq("username", usernameParam)
      .maybeSingle();

    if (profile && !profile.is_banned) {
      usernameDisplay = profile.username_display;
      countryName = profile.country_name;

      const { data: rankRows } = await admin.rpc("get_player_rank", {
        p_game_slug: slug,
        p_user_id: profile.id,
        p_country_code: null,
      });
      const r = rankRows?.[0] as
        | { rank: number; total_players: number; best_score: number }
        | undefined;
      if (r) {
        scoreText = formatScore(slug, Number(r.best_score));
        rankText = `#${Number(r.rank).toLocaleString("en-US")} of ${Number(r.total_players).toLocaleString("en-US")}`;
      }
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px",
          background: "linear-gradient(135deg, #F7F9FC 0%, #EEF4FF 60%, #FFFFFF 100%)",
          color: "#0B1220",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "9999px",
                background: game.accent,
              }}
            />
            <span style={{ fontSize: "28px", fontWeight: 800, color: "#2F6BFF" }}>
              {SITE_NAME}
            </span>
          </div>
          <span
            style={{
              fontSize: "24px",
              fontWeight: 700,
              color: "#FFFFFF",
              background: game.accent,
              padding: "10px 24px",
              borderRadius: "9999px",
            }}
          >
            {game.name}
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <span style={{ fontSize: "34px", fontWeight: 700, color: "#5B6475" }}>
            {usernameDisplay} • {countryName}
          </span>
          <span style={{ fontSize: "96px", fontWeight: 900, letterSpacing: "-2px" }}>
            {scoreText}
          </span>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "2px solid #E6EAF2",
            paddingTop: "28px",
          }}
        >
          <span style={{ fontSize: "32px", fontWeight: 800, color: "#2F6BFF" }}>
            Global Rank: {rankText}
          </span>
          <span style={{ fontSize: "24px", fontWeight: 600, color: "#5B6475" }}>
            Can you beat my score?
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
