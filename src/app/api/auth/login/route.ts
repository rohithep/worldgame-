import { NextResponse } from "next/server";
import {
  checkLoginLockout,
  checkRateLimit,
  deriveSupabasePassword,
  getClientIp,
  hashIp,
  recordLoginAttempt,
  syntheticEmail,
} from "@/lib/auth";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validators";
import { sleep } from "@/lib/utils";

const GENERIC_ERROR = "Username or PIN is incorrect.";

export async function POST(request: Request) {
  const ipHash = hashIp(getClientIp(request));

  // Per-IP rate limit across all usernames: 25 attempts per 15 minutes
  const ipAllowed = await checkRateLimit(`login-ip:${ipHash}`, 25, 900);
  if (!ipAllowed) {
    await sleep(220);
    return NextResponse.json(
      { error: "Too many login attempts. Please wait a few minutes and try again." },
      { status: 429 }
    );
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      { error: "Database is not configured yet." },
      { status: 503 }
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    await sleep(200);
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(json);
  if (!parsed.success) {
    await sleep(200);
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  const usernameLower = parsed.data.username.trim().toLowerCase();
  const pin = parsed.data.pin;

  // Check per-username lockout (5 failures -> 15 min lockout)
  const lockout = await checkLoginLockout(usernameLower);
  if (lockout.locked) {
    await sleep(220);
    const mins = Math.ceil(lockout.retryAfterSec / 60);
    return NextResponse.json(
      {
        error: `Too many failed PIN attempts for this username. Try again in ${mins} minute${mins === 1 ? "" : "s"}.`,
        locked: true,
        retryAfterSec: lockout.retryAfterSec,
      },
      { status: 429 }
    );
  }

  const admin = createSupabaseAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, username, username_display, is_banned")
    .eq("username", usernameLower)
    .maybeSingle();

  if (!profile) {
    await recordLoginAttempt(usernameLower, ipHash, false);
    await sleep(220);
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  if (profile.is_banned) {
    await sleep(220);
    return NextResponse.json(
      { error: "This account has been suspended." },
      { status: 403 }
    );
  }

  const email = syntheticEmail(usernameLower);
  const derivedPassword = deriveSupabasePassword(usernameLower, pin);

  const supabase = await createSupabaseServerClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: derivedPassword,
  });

  if (signInError) {
    await recordLoginAttempt(usernameLower, ipHash, false);
    await sleep(220);
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  await recordLoginAttempt(usernameLower, ipHash, true);
  await admin
    .from("profiles")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", profile.id);

  return NextResponse.json({
    ok: true,
    player: {
      id: profile.id,
      username: profile.username,
      usernameDisplay: profile.username_display,
    },
  });
}
