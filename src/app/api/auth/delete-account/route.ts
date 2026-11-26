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
import { deleteAccountSchema } from "@/lib/validators";
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

  const parsed = deleteAccountSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter your 6-digit PIN to confirm deletion." },
      { status: 400 }
    );
  }

  const email = syntheticEmail(player.username);
  const derived = deriveSupabasePassword(player.username, parsed.data.pin);

  const supabase = await createSupabaseServerClient();
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email,
    password: derived,
  });

  if (verifyError) {
    await sleep(220);
    return NextResponse.json({ error: "PIN is incorrect." }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const { error: deleteError } = await admin.auth.admin.deleteUser(player.id);
  if (deleteError) {
    return NextResponse.json(
      { error: "Could not delete account. Please try again." },
      { status: 500 }
    );
  }

  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
