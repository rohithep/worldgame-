import { NextResponse } from "next/server";
import { GAME_BY_SLUG, isGameSlug } from "@/lib/constants";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/server";

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  usernameDisplay: string;
  countryCode: string;
  countryName: string;
  bestScore: number;
  plays: number;
  achievedAt: string;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  if (!isGameSlug(slug)) {
    return NextResponse.json({ error: "Unknown game." }, { status: 404 });
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({
      entries: [],
      nextCursor: null,
      totalPlayers: 0,
    });
  }

  const url = new URL(request.url);
  const limit = Math.min(100, Math.max(10, Number(url.searchParams.get("limit") || 50)));
  const country = url.searchParams.get("country")?.toUpperCase() || null;
  const search = url.searchParams.get("search")?.trim().toLowerCase() || null;
  const cursorScore = url.searchParams.get("cursorScore");
  const cursorAchievedAt = url.searchParams.get("cursorAchievedAt");
  const cursorUserId = url.searchParams.get("cursorUserId");
  const startRank = Math.max(1, Number(url.searchParams.get("startRank") || 1));

  const game = GAME_BY_SLUG[slug];
  const ascending = game.scoreDirection === "lower";
  const admin = createSupabaseAdminClient();

  let query = admin
    .from("scores")
    .select(
      "user_id, best_score, plays, achieved_at, profiles!inner(id, username, username_display, country_code, country_name, is_banned)",
      { count: "exact" }
    )
    .eq("game_slug", slug)
    .eq("profiles.is_banned", false);

  if (country && /^[A-Z]{2}$/.test(country)) {
    query = query.eq("profiles.country_code", country);
  }

  if (search) {
    query = query.ilike("profiles.username", `%${search}%`);
  }

  // Keyset pagination filter (only when not searching, or even with search)
  if (cursorScore !== null && cursorAchievedAt && cursorUserId) {
    const scoreNum = Number(cursorScore);
    if (Number.isFinite(scoreNum)) {
      const cmp = ascending ? "gt" : "lt";
      query = query.or(
        `best_score.${cmp}.${scoreNum},and(best_score.eq.${scoreNum},achieved_at.gt.${cursorAchievedAt}),and(best_score.eq.${scoreNum},achieved_at.eq.${cursorAchievedAt},user_id.gt.${cursorUserId})`
      );
    }
  }

  query = query
    .order("best_score", { ascending })
    .order("achieved_at", { ascending: true })
    .order("user_id", { ascending: true })
    .limit(limit + 1);

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: "Could not load leaderboard." },
      { status: 500 }
    );
  }

  const rows = (data || []) as unknown as {
    user_id: string;
    best_score: number;
    plays: number;
    achieved_at: string;
    profiles: {
      id: string;
      username: string;
      username_display: string;
      country_code: string;
      country_name: string;
    };
  }[];

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;

  const entries: LeaderboardEntry[] = pageRows.map((row, idx) => ({
    rank: startRank + idx,
    userId: row.user_id,
    username: row.profiles.username,
    usernameDisplay: row.profiles.username_display,
    countryCode: row.profiles.country_code,
    countryName: row.profiles.country_name,
    bestScore: Number(row.best_score),
    plays: row.plays,
    achievedAt: row.achieved_at,
  }));

  const last = entries[entries.length - 1];
  const nextCursor =
    hasMore && last
      ? {
          cursorScore: last.bestScore,
          cursorAchievedAt: last.achievedAt,
          cursorUserId: last.userId,
          startRank: last.rank + 1,
        }
      : null;

  return NextResponse.json({
    entries,
    nextCursor,
    totalPlayers: count ?? entries.length,
  });
}
