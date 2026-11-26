import crypto from "crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
  isSupabaseAdminConfigured,
  isSupabaseConfigured,
} from "./supabase/server";
import { LOCKOUT_MINUTES, MAX_LOGIN_ATTEMPTS } from "./constants";

const DEV_PEPPER_FALLBACK = "dev-only-insecure-pepper-change-in-production";

function getPepper(): string {
  const pepper = process.env.SERVER_PEPPER;
  if (!pepper && process.env.NODE_ENV === "production") {
    throw new Error("SERVER_PEPPER environment variable must be set in production.");
  }
  return pepper || DEV_PEPPER_FALLBACK;
}

function getIpSalt(): string {
  return process.env.IP_HASH_SALT || getPepper();
}

export function deriveSupabasePassword(username: string, pin: string): string {
  const normalized = `${username.trim().toLowerCase()}:${pin}`;
  const digest = crypto
    .createHmac("sha256", getPepper())
    .update(normalized)
    .digest("hex");
  // Prefix ensures high entropy and satisfies any Supabase password complexity rules
  return `Wsa!${digest.slice(0, 56)}`;
}

export function syntheticEmail(username: string): string {
  const clean = username.trim().toLowerCase();
  return `${clean}@players.worldscoreboardarcade.com`;
}

export function hashIp(ip: string): string {
  return crypto
    .createHmac("sha256", getIpSalt())
    .update(ip)
    .digest("hex")
    .slice(0, 32);
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return (
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "127.0.0.1"
  );
}

// In-memory rate limit fallback when neither Upstash nor Supabase is reachable
const memoryRateLimits = new Map<string, { count: number; resetAt: number }>();

export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<boolean> {
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (upstashUrl && upstashToken) {
    try {
      const incrRes = await fetch(`${upstashUrl}/incr/${encodeURIComponent(key)}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${upstashToken}` },
      });
      const incrData = (await incrRes.json()) as { result?: number };
      const count = Number(incrData.result ?? 1);
      if (count === 1) {
        await fetch(
          `${upstashUrl}/expire/${encodeURIComponent(key)}/${windowSeconds}`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${upstashToken}` },
          }
        );
      }
      return count <= limit;
    } catch {
      // Fall through to Postgres or memory
    }
  }

  if (isSupabaseAdminConfigured()) {
    try {
      const admin = createSupabaseAdminClient();
      const { data, error } = await admin.rpc("check_rate_limit", {
        p_key: key,
        p_limit: limit,
        p_window_seconds: windowSeconds,
      });
      if (!error && typeof data === "boolean") {
        return data;
      }
    } catch {
      // Fall through to memory
    }
  }

  const now = Date.now();
  const entry = memoryRateLimits.get(key);
  if (!entry || now > entry.resetAt) {
    memoryRateLimits.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count += 1;
  return true;
}

export async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    // Allow local development without Turnstile keys configured
    return true;
  }
  if (!token) return false;

  try {
    const form = new URLSearchParams();
    form.set("secret", secret);
    form.set("response", token);
    form.set("remoteip", ip);

    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body: form,
      }
    );
    const data = (await res.json()) as { success?: boolean };
    return Boolean(data.success);
  } catch {
    return false;
  }
}

export async function checkLoginLockout(
  username: string
): Promise<{ locked: boolean; retryAfterSec: number }> {
  if (!isSupabaseAdminConfigured()) {
    return { locked: false, retryAfterSec: 0 };
  }

  const admin = createSupabaseAdminClient();
  const lower = username.trim().toLowerCase();
  const cutoff = new Date(Date.now() - LOCKOUT_MINUTES * 60 * 1000).toISOString();

  const { data } = await admin
    .from("login_attempts")
    .select("succeeded, attempted_at")
    .eq("username", lower)
    .gte("attempted_at", cutoff)
    .order("attempted_at", { ascending: false })
    .limit(20);

  if (!data || data.length === 0) {
    return { locked: false, retryAfterSec: 0 };
  }

  // Count consecutive failures since the most recent success
  let consecutiveFailures = 0;
  let oldestRelevantFailure: string | null = null;
  for (const row of data) {
    if (row.succeeded) break;
    consecutiveFailures += 1;
    oldestRelevantFailure = row.attempted_at;
  }

  if (consecutiveFailures >= MAX_LOGIN_ATTEMPTS && oldestRelevantFailure) {
    const unlockAt =
      new Date(oldestRelevantFailure).getTime() + LOCKOUT_MINUTES * 60 * 1000;
    const retryAfterSec = Math.max(1, Math.ceil((unlockAt - Date.now()) / 1000));
    return { locked: true, retryAfterSec };
  }

  return { locked: false, retryAfterSec: 0 };
}

export async function recordLoginAttempt(
  username: string,
  ipHash: string,
  succeeded: boolean
): Promise<void> {
  if (!isSupabaseAdminConfigured()) return;
  const admin = createSupabaseAdminClient();
  await admin.from("login_attempts").insert({
    username: username.trim().toLowerCase(),
    ip_hash: ipHash,
    succeeded,
  });
}

export interface PlayerSession {
  id: string;
  username: string;
  usernameDisplay: string;
  name: string | null;
  birthYear: number;
  countryCode: string;
  countryName: string;
  stateName: string | null;
  districtName: string | null;
  isBanned: boolean;
  isAdmin: boolean;
  createdAt: string;
}

export async function isAdminUser(userId: string): Promise<boolean> {
  const envAdmins = (process.env.ADMIN_USER_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (envAdmins.includes(userId)) return true;

  if (!isSupabaseAdminConfigured()) return false;
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("admin_users")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data);
}

export const getCurrentPlayer = cache(async (): Promise<PlayerSession | null> => {
  if (!isSupabaseConfigured()) return null;

  try {
    // Fast-path: if no `sb-*` auth cookie exists, return null in 0ms without a network call
    const cookieStore = await cookies();
    const hasSbCookie = cookieStore.getAll().some((c) => c.name.startsWith("sb-"));
    if (!hasSbCookie) return null;

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    // Single combined query for profile + admin status to minimize round-trips
    const client = isSupabaseAdminConfigured() ? createSupabaseAdminClient() : supabase;
    const { data: profile } = await client
      .from("profiles")
      .select(
        "id, username, username_display, name, birth_year, country_code, country_name, state_name, district_name, is_banned, created_at, admin_users(user_id)"
      )
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || profile.is_banned) return null;

    const envAdmins = (process.env.ADMIN_USER_IDS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const hasDbAdmin = Array.isArray(profile.admin_users)
      ? profile.admin_users.length > 0
      : Boolean(profile.admin_users);
    const adminFlag = envAdmins.includes(user.id) || hasDbAdmin;

    return {
      id: profile.id,
      username: profile.username,
      usernameDisplay: profile.username_display,
      name: profile.name,
      birthYear: profile.birth_year,
      countryCode: profile.country_code,
      countryName: profile.country_name,
      stateName: profile.state_name,
      districtName: profile.district_name,
      isBanned: profile.is_banned,
      isAdmin: adminFlag,
      createdAt: profile.created_at,
    };
  } catch {
    return null;
  }
});
