/**
 * Cleanly removes all seeded demo players (where `profiles.is_seed = true`).
 * Real player accounts are never touched.
 *
 * Usage: pnpm run unseed
 */
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

// Load .env.local automatically when running standalone script
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath) && typeof process.loadEnvFile === "function") {
  process.loadEnvFile(envPath);
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: seeded, error } = await admin
    .from("profiles")
    .select("id")
    .eq("is_seed", true);

  if (error) {
    console.error("Failed to query seeded profiles:", error.message);
    process.exit(1);
  }

  const rows = seeded || [];
  console.log(`Removing ${rows.length} seeded players...`);

  let removed = 0;
  for (const row of rows) {
    const { error: delErr } = await admin.auth.admin.deleteUser(row.id);
    if (!delErr) removed += 1;
  }

  console.log(`Removed ${removed} seeded players (cascaded profiles and scores).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
