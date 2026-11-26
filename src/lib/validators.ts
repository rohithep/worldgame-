import { z } from "zod";
import { MIN_AGE } from "./constants";

const RESERVED_USERNAMES = new Set([
  "admin",
  "administrator",
  "support",
  "moderator",
  "mod",
  "system",
  "root",
  "arcade",
  "staff",
  "official",
  "help",
  "security",
  "owner",
  "founder",
  "worldscoreboard",
  "scoreboard",
  "api",
  "auth",
  "login",
  "join",
  "games",
  "leaderboard",
  "privacy",
  "terms",
  "null",
  "undefined",
  "me",
  "share",
]);

const BRAND_IMPERSONATION = new Set([
  "linkedin",
  "google",
  "apple",
  "microsoft",
  "meta",
  "facebook",
  "instagram",
  "twitter",
  "openai",
  "anthropic",
  "claude",
  "gemini",
  "amazon",
  "netflix",
  "spotify",
  "discord",
  "twitch",
  "youtube",
  "tiktok",
  "snapchat",
  "vercel",
  "supabase",
  "cloudflare",
  "github",
  "nintendo",
  "playstation",
  "xbox",
]);

// Curated profanity / slur substrings (kept clean & maintainable)
const PROFANITY_LIST = [
  "fuck",
  "shit",
  "bitch",
  "asshole",
  "bastard",
  "cunt",
  "dick",
  "pussy",
  "whore",
  "slut",
  "faggot",
  "nigger",
  "nigga",
  "retard",
  "chink",
  "spic",
  "kike",
  "tranny",
  "porn",
  "penis",
  "vagina",
  "cock",
  "boobs",
  "tits",
  "nazi",
  "hitler",
  "rape",
  "molest",
  "killself",
  "kys",
  "crap",
  "wanker",
  "twat",
  "prick",
  "douche",
];

// At least 60 common 6-digit PINs blocked in addition to algorithmic pattern checks
export const COMMON_PINS = new Set([
  "000000", "111111", "222222", "333333", "444444",
  "555555", "666666", "777777", "888888", "999999",
  "123456", "654321", "012345", "543210", "234567",
  "765432", "345678", "876543", "456789", "987654",
  "121212", "212121", "131313", "232323", "101010",
  "010101", "696969", "420420", "112233", "332211",
  "123123", "321321", "123321", "111222", "222333",
  "000111", "111000", "123000", "000123", "100000",
  "200000", "102030", "112211", "122112", "135790",
  "246810", "147258", "258369", "159753", "789456",
  "456123", "147852", "963852", "852963", "123654",
  "654123", "000001", "100100", "202020", "202420",
  "202520", "202620", "199000", "200001", "112358",
  "314159", "271828", "007007", "911911", "808080",
]);

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateUsername(raw: string): ValidationResult {
  const trimmed = raw.trim();
  if (trimmed.length < 3 || trimmed.length > 20) {
    return { valid: false, error: "Username must be 3 to 20 characters." };
  }
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
    return {
      valid: false,
      error: "Use only letters, numbers, and underscores.",
    };
  }
  if (/^_+$/.test(trimmed)) {
    return { valid: false, error: "Username must contain letters or numbers." };
  }

  const lower = trimmed.toLowerCase();
  const collapsed = lower.replace(/_/g, "");

  if (RESERVED_USERNAMES.has(lower) || RESERVED_USERNAMES.has(collapsed)) {
    return { valid: false, error: "This username is reserved." };
  }

  for (const brand of BRAND_IMPERSONATION) {
    if (lower === brand || collapsed === brand || lower.startsWith(`${brand}_`) || lower.endsWith(`_${brand}`)) {
      return { valid: false, error: "Brand impersonation usernames are not allowed." };
    }
  }

  for (const bad of PROFANITY_LIST) {
    if (collapsed.includes(bad)) {
      return { valid: false, error: "Please choose a family-friendly username." };
    }
  }

  return { valid: true };
}

export function validatePin(pin: string): ValidationResult {
  if (!/^\d{6}$/.test(pin)) {
    return { valid: false, error: "PIN must be exactly 6 digits." };
  }

  // All same digit (e.g. 777777)
  if (/^(\d)\1{5}$/.test(pin)) {
    return { valid: false, error: "PIN cannot be all the same digit." };
  }

  // Straight ascending or descending run (e.g. 123456, 765432)
  let ascending = true;
  let descending = true;
  for (let i = 1; i < 6; i++) {
    const prev = Number(pin[i - 1]);
    const curr = Number(pin[i]);
    if (curr !== (prev + 1) % 10) ascending = false;
    if (curr !== (prev + 9) % 10) descending = false;
  }
  if (ascending || descending) {
    return { valid: false, error: "PIN cannot be a simple sequential run." };
  }

  // Repeating 2-digit or 3-digit pattern (e.g. 121212, 123123)
  if (/^(\d\d)\1\1$/.test(pin) || /^(\d\d\d)\1$/.test(pin)) {
    return { valid: false, error: "PIN cannot be a simple repeating pattern." };
  }

  if (COMMON_PINS.has(pin)) {
    return { valid: false, error: "That PIN is too common. Pick a stronger 6-digit PIN." };
  }

  return { valid: true };
}

export function validateBirthYear(birthYear: number, minAge = MIN_AGE): ValidationResult {
  const currentYear = new Date().getFullYear();
  if (!Number.isInteger(birthYear) || birthYear < 1900 || birthYear > currentYear) {
    return { valid: false, error: "Please choose a valid birth year." };
  }
  const approxAge = currentYear - birthYear;
  if (approxAge < minAge) {
    return {
      valid: false,
      error: `Players must be at least ${minAge} years old to create an account. Younger players should ask a parent or guardian.`,
    };
  }
  return { valid: true };
}

export function sanitizeFreeText(input: string | null | undefined, maxLen = 80): string | null {
  if (!input) return null;
  const cleaned = input
    .replace(/<[^>]*>/g, "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen);
  return cleaned.length > 0 ? cleaned : null;
}

export const registerSchema = z.object({
  name: z.string().max(80).optional().nullable(),
  birthYear: z.number().int().min(1900).max(new Date().getFullYear()),
  countryCode: z.string().length(2).regex(/^[A-Z]{2}$/),
  countryName: z.string().min(1).max(100),
  stateName: z.string().max(80).optional().nullable(),
  districtName: z.string().max(80).optional().nullable(),
  stateSource: z.enum(["list", "custom", "none"]).default("list"),
  districtSource: z.enum(["list", "custom", "none"]).default("list"),
  username: z.string().min(3).max(20),
  pin: z.string().regex(/^\d{6}$/),
  turnstileToken: z.string().optional().default(""),
});

export const loginSchema = z.object({
  username: z.string().min(1).max(30),
  pin: z.string().regex(/^\d{6}$/),
});

export const changePinSchema = z.object({
  currentPin: z.string().regex(/^\d{6}$/),
  newPin: z.string().regex(/^\d{6}$/),
});

export const deleteAccountSchema = z.object({
  pin: z.string().regex(/^\d{6}$/),
});
