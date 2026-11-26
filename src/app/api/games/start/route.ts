import { NextResponse } from "next/server";
import { checkRateLimit, getCurrentPlayer } from "@/lib/auth";
import { isGameSlug } from "@/lib/constants";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const player = await getCurrentPlayer();
  if (!player) {
    return NextResponse.json(
      { error: "Sign in to record scores on the global leaderboard." },
      { status: 401 }
    );
  }

  const allowed = await checkRateLimit(`game-start:${player.id}`, 60, 60);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many games started. Please slow down." },
      { status: 429 }
    );
  }

  let body: { gameSlug?: string };
  try {
    body = (await request.json()) as { gameSlug?: string };
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!body.gameSlug || !isGameSlug(body.gameSlug)) {
    return NextResponse.json({ error: "Unknown game." }, { status: 400 });
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: "Database unavailable." }, { status: 503 });
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("game_sessions")
    .insert({
      user_id: player.id,
      game_slug: body.gameSlug,
      status: "active",
    })
    .select("id, started_at")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "Could not start game session." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    sessionId: data.id,
    startedAt: data.started_at,
  });
}
