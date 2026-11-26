/**
 * Seed 200 demo players across many countries and all 9 games.
 * All seeded rows are marked `is_seed = true` so `pnpm run unseed` can cleanly remove them.
 *
 * Usage: pnpm run seed
 */
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { COUNTRIES } from "../src/data/countries";
import { GAMES, type GameSlug } from "../src/lib/constants";

// Load .env.local automatically when running standalone script
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath) && typeof process.loadEnvFile === "function") {
  process.loadEnvFile(envPath);
}

const SEED_COUNT = 200;

const ADJECTIVES = [
  "Swift", "Bright", "Pixel", "Cosmic", "Nova", "Solar", "Turbo", "Crisp",
  "Velvet", "Neon", "Hyper", "Lucky", "Golden", "Silver", "Quantum", "Zenith",
  "Frost", "Ember", "Echo", "Orbit",
];

const NOUNS = [
  "Falcon", "Comet", "Panda", "Tiger", "Viper", "Otter", "Spark", "Pulse",
  "Racer", "Knight", "Wizard", "Rocket", "Fox", "Hawk", "Wolf", "Lynx",
  "Drifter", "Striker", "Ace", "Voyager",
];

function randomScore(slug: GameSlug): number {
  switch (slug) {
    case "higher-or-lower":
      return Math.floor(Math.random() * 28) + 1;
    case "flag-streak":
      return Math.floor(Math.random() * 42) + 1;
    case "typing-sprint":
      return Math.floor(35 + Math.random() * 95);
    case "math-dash":
      return Math.floor(8 + Math.random() * 38);
    case "word-scramble":
      return Math.floor(4 + Math.random() * 24);
    case "blind-stopwatch":
      // Lower is better (ms off 10.000s)
      return Math.floor(8 + Math.pow(Math.random(), 2) * 1400);
    case "blurry-reveal":
      return Math.floor(1400 + Math.random() * 3400);
    case "guess-the-number":
      return Math.floor(1800 + Math.random() * 3050);
    case "color-whisperer":
      return Math.floor(2200 + Math.random() * 2700);
  }
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

  const countryPool = COUNTRIES.slice(0, 60);
  console.log(`Seeding ${SEED_COUNT} players across ${countryPool.length} countries...`);

  let createdCount = 0;

  for (let i = 1; i <= SEED_COUNT; i++) {
    const adj = ADJECTIVES[i % ADJECTIVES.length];
    const noun = NOUNS[Math.floor(i / ADJECTIVES.length) % NOUNS.length];
    const usernameDisplay = `Seed_${adj}${noun}${i}`;
    const usernameLower = usernameDisplay.toLowerCase();
    const email = `${usernameLower}@players.worldscoreboardarcade.com`;
    const password = `Seed!${crypto.randomBytes(16).toString("hex")}`;
    const country = countryPool[i % countryPool.length];

    const { data: userRes, error: userErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username: usernameLower, is_seed: true },
    });

    if (userErr || !userRes.user) {
      continue;
    }

    const userId = userRes.user.id;
    const { error: profErr } = await admin.from("profiles").insert({
      id: userId,
      username: usernameLower,
      username_display: usernameDisplay,
      name: null,
      birth_year: 1985 + (i % 24),
      country_code: country.code,
      country_name: country.name,
      state_name: null,
      district_name: null,
      state_source: "none",
      district_source: "none",
      is_seed: true,
    });

    if (profErr) {
      await admin.auth.admin.deleteUser(userId);
      continue;
    }

    const scoreRows = GAMES.map((g) => {
      const daysAgo = Math.floor(Math.random() * 45);
      const achievedAt = new Date(
        Date.now() - daysAgo * 24 * 60 * 60 * 1000 - Math.floor(Math.random() * 3600_000)
      ).toISOString();
      return {
        user_id: userId,
        game_slug: g.slug,
        best_score: randomScore(g.slug),
        plays: Math.floor(Math.random() * 15) + 1,
        achieved_at: achievedAt,
        updated_at: achievedAt,
      };
    });

    await admin.from("scores").insert(scoreRows);
    createdCount += 1;

    if (createdCount % 25 === 0) {
      console.log(`  Created ${createdCount}/${SEED_COUNT} seeded players...`);
    }
  }

  console.log(`Done! Seeded ${createdCount} players and ${createdCount * GAMES.length} scores.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
