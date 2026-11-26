import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit, getCurrentPlayer } from "@/lib/auth";
import { isGameSlug } from "@/lib/constants";
import { checkScorePlausibility } from "@/lib/plausibility";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/server";

const finishSchema = z.object({
  sessionId: z.string().uuid(),
  gameSlug: z.string(),
  score: z.number().finite(),
  roundLog: z
    .array(
      z.object({
        ms: z.number().nonnegative(),
        correct: z.boolean().optional(),
        points: z.number().optional(),
      })
    )
    .max(500)
    .optional(),
});

export async function POST(request: Request) {
  const player = await getCurrentPlayer();
  if (!player) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  // Rate limit: 30 score submissions per minute per user
  const allowed = await checkRateLimit(`game-finish:${player.id}`, 30, 60);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many submissions. Please wait a moment." },
      { status: 429 }
    );
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: "Database unavailable." }, { status: 503 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = finishSchema.safeParse(json);
  if (!parsed.success || !isGameSlug(parsed.data.gameSlug)) {
    return NextResponse.json({ error: "Invalid submission." }, { status: 400 });
  }

  const { sessionId, gameSlug, score, roundLog } = parsed.data;
  const admin = createSupabaseAdminClient();

  // Verify session belongs to this user and is unused
  const { data: session } = await admin
    .from("game_sessions")
    .select("id, user_id, game_slug, started_at, status")
    .eq("id", sessionId)
    .maybeSingle();

  if (
    !session ||
    session.user_id !== player.id ||
    session.game_slug !== gameSlug ||
    session.status !== "active"
  ) {
    return NextResponse.json(
      { error: "Could not record this run." },
      { status: 400 }
    );
  }

  const now = new Date();
  const serverElapsedMs = now.getTime() - new Date(session.started_at).getTime();

  const plausibility = checkScorePlausibility({
    slug: gameSlug,
    score,
    serverElapsedMs,
    roundLog,
  });

  if (!plausibility.ok) {
    await admin
      .from("game_sessions")
      .update({
        status: "rejected",
        finished_at: now.toISOString(),
        meta: { rejected_reason: plausibility.reason, submitted_score: score, serverElapsedMs },
      })
      .eq("id", sessionId);

    await admin.from("suspicious_submissions").insert({
      user_id: player.id,
      game_slug: gameSlug,
      session_id: sessionId,
      submitted_score: score,
      reason: plausibility.reason || "plausibility_failed",
      meta: { serverElapsedMs, roundCount: roundLog?.length ?? 0 },
    });

    // Reject without telling the client the specific anti-cheat trigger
    return NextResponse.json(
      { error: "Score could not be verified." },
      { status: 422 }
    );
  }

  // Mark session completed
  await admin
    .from("game_sessions")
    .update({
      status: "completed",
      finished_at: now.toISOString(),
      meta: { score, serverElapsedMs },
    })
    .eq("id", sessionId);

  // Atomically submit via SECURITY DEFINER RPC
  const { data: submitRows, error: submitError } = await admin.rpc("submit_score", {
    p_user_id: player.id,
    p_game_slug: gameSlug,
    p_score: score,
  });

  if (submitError || !submitRows || !submitRows[0]) {
    return NextResponse.json(
      { error: "Failed to save score." },
      { status: 500 }
    );
  }

  const saved = submitRows[0] as {
    is_new_best: boolean;
    best_score: number;
    plays: number;
    achieved_at: string;
  };

  // Fetch updated global rank
  const { data: rankRows } = await admin.rpc("get_player_rank", {
    p_game_slug: gameSlug,
    p_user_id: player.id,
    p_country_code: null,
  });

  const rankRow = rankRows?.[0] as
    | { rank: number; total_players: number }
    | undefined;

  return NextResponse.json({
    ok: true,
    isNewBest: saved.is_new_best,
    bestScore: Number(saved.best_score),
    plays: saved.plays,
    rank: rankRow ? Number(rankRow.rank) : null,
    totalPlayers: rankRow ? Number(rankRow.total_players) : null,
  });
}
