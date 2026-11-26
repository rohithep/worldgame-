import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";

const migrationPath = path.join(
  process.cwd(),
  "supabase",
  "migrations",
  "0001_initial_schema.sql"
);
const sql = fs.readFileSync(migrationPath, "utf-8");

describe("RLS migration policy verification", () => {
  const tables = [
    "profiles",
    "games",
    "scores",
    "game_sessions",
    "login_attempts",
    "rate_limits",
    "reports",
    "admin_users",
    "suspicious_submissions",
  ];

  it("enables Row Level Security on every table", () => {
    for (const table of tables) {
      expect(sql).toContain(`alter table public.${table} enable row level security;`);
    }
  });

  it("exposes only non-PII columns in public_profiles view", () => {
    const match = sql.match(/create or replace view public\.public_profiles as([\s\S]*?);/);
    expect(match).not.toBeNull();
    const viewBody = match![1];
    expect(viewBody).toContain("username");
    expect(viewBody).toContain("country_code");
    expect(viewBody).toContain("country_name");
    expect(viewBody).not.toContain("birth_year");
    expect(viewBody).not.toContain("state_name");
    expect(viewBody).not.toContain("district_name");
    expect(viewBody).not.toMatch(/\bname\b,/);
  });

  it("revokes direct client execution of submit_score RPC", () => {
    expect(sql).toContain(
      "revoke all on function public.submit_score(uuid, text, numeric) from anon, authenticated;"
    );
    expect(sql).toContain(
      "grant execute on function public.submit_score(uuid, text, numeric) to service_role;"
    );
  });

  it("does not define any client insert/update policy on scores or game_sessions", () => {
    expect(sql).not.toMatch(/on public\.scores for (insert|update|delete)/i);
    expect(sql).not.toMatch(/on public\.game_sessions for (insert|update|delete)/i);
  });
});

// Live Supabase RLS checks (executed when Supabase env vars are provided)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

describe.skipIf(!supabaseUrl || !supabaseAnon)("Live Supabase RLS enforcement", () => {
  it("blocks anonymous inserts into scores", async () => {
    const anon = createClient(supabaseUrl!, supabaseAnon!);
    const { error } = await anon.from("scores").insert({
      user_id: "00000000-0000-0000-0000-000000000000",
      game_slug: "blind-stopwatch",
      best_score: 1,
    });
    expect(error).not.toBeNull();
  });

  it("blocks anonymous reads of private profiles table", async () => {
    const anon = createClient(supabaseUrl!, supabaseAnon!);
    const { data } = await anon.from("profiles").select("name, birth_year").limit(5);
    expect(data ?? []).toHaveLength(0);
  });
});
