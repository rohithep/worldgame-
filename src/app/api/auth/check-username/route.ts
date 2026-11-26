import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp, hashIp } from "@/lib/auth";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/server";
import { validateUsername } from "@/lib/validators";

export async function POST(request: Request) {
  const ipHash = hashIp(getClientIp(request));
  const allowed = await checkRateLimit(`check-username:${ipHash}`, 40, 60);
  if (!allowed) {
    return NextResponse.json(
      { available: false, error: "Too many checks. Please wait a moment." },
      { status: 429 }
    );
  }

  let body: { username?: string };
  try {
    body = (await request.json()) as { username?: string };
  } catch {
    return NextResponse.json(
      { available: false, error: "Invalid request." },
      { status: 400 }
    );
  }

  const raw = typeof body.username === "string" ? body.username.trim() : "";
  const validation = validateUsername(raw);
  if (!validation.valid) {
    return NextResponse.json({
      available: false,
      error: validation.error,
    });
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({
      available: true,
      note: "Supabase is not configured yet; availability cannot be verified against a database.",
    });
  }

  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id")
    .eq("username", raw.toLowerCase())
    .maybeSingle();

  if (data) {
    return NextResponse.json({
      available: false,
      error: "That username is already taken.",
    });
  }

  return NextResponse.json({ available: true });
}
