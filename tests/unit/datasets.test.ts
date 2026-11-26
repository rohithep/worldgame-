import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import * as Flags from "country-flag-icons/react/3x2";
import { COUNTRIES } from "@/data/countries";
import { GUESS_NUMBER_QUESTIONS } from "@/data/guess-number-questions";
import { TYPING_WORDS } from "@/data/typing-words";
import { SCRAMBLE_WORDS } from "@/data/scramble-words";

describe("Dataset integrity & factual bounds", () => {
  it("every country in COUNTRIES has a valid SVG flag, unique code/name, and positive pop & area", () => {
    const flagKeys = new Set(Object.keys(Flags));
    const codes = new Set<string>();
    const names = new Set<string>();

    expect(COUNTRIES.length).toBeGreaterThanOrEqual(195);

    for (const c of COUNTRIES) {
      expect(flagKeys.has(c.code), `Missing SVG flag for ${c.code} (${c.name})`).toBe(true);
      expect(codes.has(c.code), `Duplicate country code: ${c.code}`).toBe(false);
      expect(names.has(c.name), `Duplicate country name: ${c.name}`).toBe(false);
      expect(c.population).toBeGreaterThan(0);
      expect(c.areaKm2).toBeGreaterThan(0);
      codes.add(c.code);
      names.add(c.name);
    }
  });

  it("every Guess the Number question has valid bounds, unique id, source, and answer within [min, max]", () => {
    const ids = new Set<string>();
    expect(GUESS_NUMBER_QUESTIONS.length).toBeGreaterThanOrEqual(50);

    for (const q of GUESS_NUMBER_QUESTIONS) {
      expect(ids.has(q.id), `Duplicate question id: ${q.id}`).toBe(false);
      expect(q.min).toBeGreaterThan(0);
      expect(q.max).toBeGreaterThan(q.min);
      expect(q.answer).toBeGreaterThanOrEqual(q.min);
      expect(q.answer).toBeLessThanOrEqual(q.max);
      expect(q.d).toBeGreaterThan(0);
      expect(q.source.length).toBeGreaterThan(1);
      expect(q.year).toBeGreaterThanOrEqual(2000);
      ids.add(q.id);
    }
  });

  it("Typing Sprint words are unique lowercase alphabetic words", () => {
    const unique = new Set(TYPING_WORDS);
    expect(unique.size).toBe(TYPING_WORDS.length);
    expect(TYPING_WORDS.length).toBeGreaterThanOrEqual(450);
    for (const w of TYPING_WORDS) {
      expect(/^[a-z]+$/.test(w), `Invalid typing word: ${w}`).toBe(true);
    }
  });

  it("Word Scramble words are unique 4-8 letter lowercase words", () => {
    const unique = new Set(SCRAMBLE_WORDS);
    expect(unique.size).toBe(SCRAMBLE_WORDS.length);
    expect(SCRAMBLE_WORDS.length).toBeGreaterThanOrEqual(550);
    for (const w of SCRAMBLE_WORDS) {
      expect(/^[a-z]{4,8}$/.test(w), `Invalid scramble word: ${w}`).toBe(true);
    }
  });

  it("Blurry Reveal manifest has >= 60 unique items and every image file exists on disk", () => {
    const manifestPath = path.join(process.cwd(), "public", "assets", "reveal", "manifest.json");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as {
      count: number;
      items: { id: string; answer: string; image: string }[];
    };
    expect(manifest.items.length).toBeGreaterThanOrEqual(60);

    const ids = new Set<string>();
    const answers = new Set<string>();
    for (const item of manifest.items) {
      expect(ids.has(item.id), `Duplicate reveal id: ${item.id}`).toBe(false);
      expect(answers.has(item.answer.toLowerCase()), `Duplicate reveal answer: ${item.answer}`).toBe(false);
      const diskPath = path.join(process.cwd(), "public", item.image);
      expect(fs.existsSync(diskPath), `Missing reveal file: ${item.image}`).toBe(true);
      ids.add(item.id);
      answers.add(item.answer.toLowerCase());
    }
  });
});
