import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentPlayer } from "@/lib/auth";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/server";

const adminActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("remove_score"),
    userId: z.string().uuid(),
    gameSlug: z.string().min(1),
  }),
  z.object({
    action: z.literal("set_ban"),
    userId: z.string().uuid(),
    banned: z.boolean(),
  }),
  z.object({
    action: z.literal("update_report"),
    reportId: z.string().uuid(),
    status: z.enum(["reviewed", "dismissed", "actioned"]),
  }),
]);

export async function POST(request: Request) {
  const player = await getCurrentPlayer();
  if (!player || !player.isAdmin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
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

  const parsed = adminActionSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid action payload." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const payload = parsed.data;

  if (payload.action === "remove_score") {
    const { error } = await admin
      .from("scores")
      .delete()
      .eq("user_id", payload.userId)
      .eq("game_slug", payload.gameSlug);
    if (error) {
      return NextResponse.json({ error: "Could not remove score." }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  if (payload.action === "set_ban") {
    const { error } = await admin
      .from("profiles")
      .update({ is_banned: payload.banned })
      .eq("id", payload.userId);
    if (error) {
      return NextResponse.json({ error: "Could not update ban state." }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  if (payload.action === "update_report") {
    const { error } = await admin
      .from("reports")
      .update({
        status: payload.status,
        reviewed_at: new Date().toISOString(),
        reviewed_by: player.id,
      })
      .eq("id", payload.reportId);
    if (error) {
      return NextResponse.json({ error: "Could not update report." }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
}
