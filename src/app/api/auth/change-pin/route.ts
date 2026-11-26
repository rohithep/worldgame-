import { NextResponse } from "next/server";
import {
  deriveSupabasePassword,
  getCurrentPlayer,
  syntheticEmail,
} from "@/lib/auth";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";
import { changePinSchema, validatePin } from "@/lib/validators";
import { sleep } from "@/lib/utils";

export async function POST(request: Request) {
  const player = await getCurrentPlayer();
  if (!player) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = changePinSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter valid 6-digit PINs." },
      { status: 400 }
    );
  }

  const newPinCheck = validatePin(parsed.data.newPin);
  if (!newPinCheck.valid) {
    return NextResponse.json({ error: newPinCheck.error }, { status: 400 });
  }

  const email = syntheticEmail(player.username);
  const currentDerived = deriveSupabasePassword(
    player.username,
    parsed.data.currentPin
  );

  // Verify current PIN
  const supabase = await createSupabaseServerClient();
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email,
    password: currentDerived,
  });

  if (verifyError) {
    await sleep(220);
    return NextResponse.json(
      { error: "Current PIN is incorrect." },
      { status: 401 }
    );
  }

  const newDerived = deriveSupabasePassword(player.username, parsed.data.newPin);
  const admin = createSupabaseAdminClient();
  const { error: updateError } = await admin.auth.admin.updateUserById(
    player.id,
    { password: newDerived }
  );

  if (updateError) {
    return NextResponse.json(
      { error: "Could not update PIN. Please try again." },
      { status: 500 }
    );
  }

  // Refresh session with new password
  await supabase.auth.signInWithPassword({
    email,
    password: newDerived,
  });

  return NextResponse.json({ ok: true });
}
