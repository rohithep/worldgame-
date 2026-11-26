import { NextResponse } from "next/server";
import {
  checkRateLimit,
  deriveSupabasePassword,
  getClientIp,
  hashIp,
  syntheticEmail,
  verifyTurnstile,
} from "@/lib/auth";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/server";
import {
  registerSchema,
  sanitizeFreeText,
  validateBirthYear,
  validatePin,
  validateUsername,
} from "@/lib/validators";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const ipHash = hashIp(ip);

  // Per-IP registration rate limit: 10 accounts per hour
  const allowed = await checkRateLimit(`register:${ipHash}`, 10, 3600);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many sign-ups from this network. Please try again later." },
      { status: 429 }
    );
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      {
        error:
          "Database is not configured yet. Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY.",
      },
      { status: 503 }
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please check all required fields and try again." },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // Turnstile CAPTCHA check
  const captchaOk = await verifyTurnstile(data.turnstileToken, ip);
  if (!captchaOk) {
    return NextResponse.json(
      { error: "Human verification failed. Please complete the challenge." },
      { status: 400 }
    );
  }

  const ageCheck = validateBirthYear(data.birthYear);
  if (!ageCheck.valid) {
    return NextResponse.json({ error: ageCheck.error }, { status: 400 });
  }

  const usernameCheck = validateUsername(data.username);
  if (!usernameCheck.valid) {
    return NextResponse.json({ error: usernameCheck.error }, { status: 400 });
  }

  const pinCheck = validatePin(data.pin);
  if (!pinCheck.valid) {
    return NextResponse.json({ error: pinCheck.error }, { status: 400 });
  }

  const usernameDisplay = data.username.trim();
  const usernameLower = usernameDisplay.toLowerCase();
  const admin = createSupabaseAdminClient();

  // Final server-side uniqueness check
  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .eq("username", usernameLower)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "That username is already taken. Please pick another." },
      { status: 409 }
    );
  }

  const email = syntheticEmail(usernameLower);
  const derivedPassword = deriveSupabasePassword(usernameLower, data.pin);

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: derivedPassword,
    email_confirm: true,
    user_metadata: {
      username: usernameLower,
      username_display: usernameDisplay,
    },
  });

  if (createError || !created.user) {
    return NextResponse.json(
      { error: "Could not create account. Please try a different username." },
      { status: 400 }
    );
  }

  const userId = created.user.id;

  const cleanName = sanitizeFreeText(data.name, 80);
  const cleanState = sanitizeFreeText(data.stateName, 80);
  const cleanDistrict = sanitizeFreeText(data.districtName, 80);

  const { error: profileError } = await admin.from("profiles").insert({
    id: userId,
    username: usernameLower,
    username_display: usernameDisplay,
    name: cleanName,
    birth_year: data.birthYear,
    country_code: data.countryCode.toUpperCase(),
    country_name: sanitizeFreeText(data.countryName, 100) || data.countryCode,
    state_name: cleanState,
    district_name: cleanDistrict,
    state_source: cleanState ? data.stateSource : "none",
    district_source: cleanDistrict ? data.districtSource : "none",
  });

  if (profileError) {
    // Roll back auth user if profile creation fails
    await admin.auth.admin.deleteUser(userId);
    return NextResponse.json(
      { error: "Could not save player profile. Please try again." },
      { status: 500 }
    );
  }

  // Sign in server-side so @supabase/ssr sets httpOnly cookies
  const supabase = await createSupabaseServerClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: derivedPassword,
  });

  if (signInError) {
    return NextResponse.json(
      { error: "Account created, but automatic sign-in failed. Please log in." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    player: {
      id: userId,
      username: usernameLower,
      usernameDisplay,
      countryCode: data.countryCode.toUpperCase(),
      countryName: data.countryName,
    },
  });
}
