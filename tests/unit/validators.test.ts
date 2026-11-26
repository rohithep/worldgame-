import { describe, expect, it } from "vitest";
import {
  COMMON_PINS,
  sanitizeFreeText,
  validateBirthYear,
  validatePin,
  validateUsername,
} from "@/lib/validators";

describe("Username validator", () => {
  it("accepts valid 3-20 char alphanumeric + underscore usernames", () => {
    expect(validateUsername("Nova_99").valid).toBe(true);
    expect(validateUsername("abc").valid).toBe(true);
    expect(validateUsername("Player_One_2026").valid).toBe(true);
  });

  it("rejects short, long, or invalid characters", () => {
    expect(validateUsername("ab").valid).toBe(false);
    expect(validateUsername("a".repeat(21)).valid).toBe(false);
    expect(validateUsername("bad-name").valid).toBe(false);
    expect(validateUsername("bad name").valid).toBe(false);
    expect(validateUsername("___").valid).toBe(false);
  });

  it("blocks reserved words, brand impersonation, and profanity", () => {
    expect(validateUsername("admin").valid).toBe(false);
    expect(validateUsername("Moderator").valid).toBe(false);
    expect(validateUsername("LinkedIn").valid).toBe(false);
    expect(validateUsername("google_official").valid).toBe(false);
    expect(validateUsername("super_shit_1").valid).toBe(false);
  });
});

describe("PIN validator", () => {
  it("contains at least 50 blocked common PINs", () => {
    expect(COMMON_PINS.size).toBeGreaterThanOrEqual(50);
  });

  it("rejects weak, sequential, repeating, and common PINs", () => {
    expect(validatePin("12345").valid).toBe(false);
    expect(validatePin("abcdef").valid).toBe(false);
    expect(validatePin("777777").valid).toBe(false);
    expect(validatePin("123456").valid).toBe(false);
    expect(validatePin("654321").valid).toBe(false);
    expect(validatePin("121212").valid).toBe(false);
    expect(validatePin("123123").valid).toBe(false);
    expect(validatePin("112233").valid).toBe(false);
  });

  it("accepts strong 6-digit PINs", () => {
    expect(validatePin("482917").valid).toBe(true);
    expect(validatePin("904731").valid).toBe(true);
  });
});

describe("Birth year & sanitizer", () => {
  it("enforces MIN_AGE", () => {
    const currentYear = new Date().getFullYear();
    expect(validateBirthYear(currentYear - 10, 13).valid).toBe(false);
    expect(validateBirthYear(currentYear - 13, 13).valid).toBe(true);
    expect(validateBirthYear(1995, 13).valid).toBe(true);
  });

  it("strips HTML and trims free text to 80 chars", () => {
    expect(sanitizeFreeText("  <b>Bengaluru</b>  ")).toBe("Bengaluru");
    expect(sanitizeFreeText("   ")).toBeNull();
    expect(sanitizeFreeText("a".repeat(120))?.length).toBe(80);
  });
});
