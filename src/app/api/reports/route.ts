import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit, getCurrentPlayer } from "@/lib/auth";
import { isGameSlug } from "@/lib/constants";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/server";
import { sanitizeFreeText } from "@/lib/validators";

const reportSchema = z.object({
  reportedUserId: z.string().uuid(),
  gameSlug: z.string().optional(),
  reason: z.string().min(3).max(200),
});

export async function POST(request: Request) {
  const player = await getCurrentPlayer();
  if (!player) {
    return NextResponse.json(
      { error: "Sign in to submit a report." },
      { status: 401 }
    );
  }

  const allowed = await checkRateLimit(`report:${player.id}`, 10, 3600);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many reports submitted. Please try later." },
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

  const parsed = reportSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid report details." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const cleanReason = sanitizeFreeText(parsed.data.reason, 200) || "Suspicious activity";
  const slug =
    parsed.data.gameSlug && isGameSlug(parsed.data.gameSlug)
      ? parsed.data.gameSlug
      : null;

  const { error } = await admin.from("reports").insert({
    reporter_id: player.id,
    reported_user_id: parsed.data.reportedUserId,
    game_slug: slug,
    reason: cleanReason,
  });

  if (error) {
    return NextResponse.json(
      { error: "Could not submit report." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
