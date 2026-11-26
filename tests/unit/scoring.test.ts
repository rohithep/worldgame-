import { describe, expect, it } from "vitest";
import {
  ciede2000,
  compareRankEntries,
  hsbToRgb,
  scoreBlindStopwatch,
  scoreBlurryRevealRound,
  scoreColorWhispererRound,
  scoreFlagStreak,
  scoreGuessTheNumberRound,
  scoreHigherOrLower,
  scoreMathDash,
  scoreTypingSprint,
  scoreWordScramble,
} from "@/lib/scoring";
import { checkScorePlausibility } from "@/lib/plausibility";

describe("Scoring functions", () => {
  it("Blind Stopwatch scores absolute distance from 10,000 ms", () => {
    expect(scoreBlindStopwatch(10000)).toBe(0);
    expect(scoreBlindStopwatch(10043)).toBe(43);
    expect(scoreBlindStopwatch(9875.4)).toBe(125);
  });

  it("Higher or Lower, Flag Streak, Math Dash, Word Scramble clamp non-negative integers", () => {
    expect(scoreHigherOrLower(12)).toBe(12);
    expect(scoreHigherOrLower(-3)).toBe(0);
    expect(scoreFlagStreak(25.8)).toBe(25);
    expect(scoreMathDash(34)).toBe(34);
    expect(scoreWordScramble(18)).toBe(18);
  });

  it("Typing Sprint computes Net WPM and caps at 250", () => {
    // 150 correct chars in 30s = 30 words in 0.5m = 60 WPM
    const perfect = scoreTypingSprint(150, 150, 30);
    expect(perfect.netWpm).toBe(60);
    expect(perfect.accuracy).toBe(100);

    // Errors reduce net WPM
    const withErrors = scoreTypingSprint(150, 160, 30);
    expect(withErrors.netWpm).toBeLessThan(60);
    expect(withErrors.accuracy).toBeLessThan(100);

    // Capped at 250
    const superFast = scoreTypingSprint(1500, 1500, 30);
    expect(superFast.netWpm).toBe(250);
  });

  it("Blurry Reveal gives 1000 at 0ms, decreases smoothly, 0 when wrong", () => {
    expect(scoreBlurryRevealRound(0, 15000, true)).toBe(1000);
    expect(scoreBlurryRevealRound(7500, 15000, true)).toBe(550);
    expect(scoreBlurryRevealRound(15000, 15000, true)).toBe(100);
    expect(scoreBlurryRevealRound(2000, 15000, false)).toBe(0);
  });

  it("Guess the Number uses log10 distance with tolerance D", () => {
    expect(scoreGuessTheNumberRound(8849, 8849, 1)).toBe(1000);
    // 10x off with D=1 -> log10 diff = 1 -> 0 pts
    expect(scoreGuessTheNumberRound(1000, 100, 1)).toBe(0);
    // sqrt(10)x off with D=1 -> log10 diff = 0.5 -> 500 pts
    expect(scoreGuessTheNumberRound(316.227, 100, 1)).toBe(500);
  });

  it("Color Whisperer uses CIEDE2000 perceptual distance", () => {
    const exact = scoreColorWhispererRound(
      { h: 210, s: 80, b: 90 },
      { h: 210, s: 80, b: 90 }
    );
    expect(exact.deltaE).toBe(0);
    expect(exact.points).toBe(1000);

    const far = scoreColorWhispererRound(
      { h: 0, s: 100, b: 100 },
      { h: 180, s: 100, b: 100 }
    );
    expect(far.deltaE).toBeGreaterThan(40);
    expect(far.points).toBeLessThan(200);

    expect(ciede2000(hsbToRgb({ h: 0, s: 0, b: 100 }), hsbToRgb({ h: 0, s: 0, b: 0 }))).toBeGreaterThan(90);
  });
});

describe("Leaderboard tie-breaking", () => {
  it("orders higher-wins by score desc, then earlier achievedAt, then userId asc", () => {
    const list = [
      { userId: "b", bestScore: 50, achievedAt: "2026-01-01T00:00:05Z" },
      { userId: "a", bestScore: 50, achievedAt: "2026-01-01T00:00:05Z" },
      { userId: "c", bestScore: 50, achievedAt: "2026-01-01T00:00:02Z" },
      { userId: "d", bestScore: 80, achievedAt: "2026-01-01T00:00:10Z" },
    ];
    list.sort((x, y) => compareRankEntries(x, y, "higher"));
    expect(list.map((x) => x.userId)).toEqual(["d", "c", "a", "b"]);
  });

  it("orders lower-wins (Blind Stopwatch) by score asc, then earlier achievedAt", () => {
    const list = [
      { userId: "b", bestScore: 42, achievedAt: "2026-01-01T00:00:05Z" },
      { userId: "a", bestScore: 15, achievedAt: "2026-01-01T00:00:10Z" },
      { userId: "c", bestScore: 42, achievedAt: "2026-01-01T00:00:01Z" },
    ];
    list.sort((x, y) => compareRankEntries(x, y, "lower"));
    expect(list.map((x) => x.userId)).toEqual(["a", "c", "b"]);
  });
});

describe("Plausibility checks", () => {
  it("rejects 30-second game finished in 10 seconds", () => {
    const res = checkScorePlausibility({
      slug: "typing-sprint",
      score: 90,
      serverElapsedMs: 10_000,
    });
    expect(res.ok).toBe(false);
  });

  it("rejects impossible Flag Streak answer faster than 400ms", () => {
    const res = checkScorePlausibility({
      slug: "flag-streak",
      score: 5,
      serverElapsedMs: 6000,
      roundLog: [{ ms: 120, correct: true }],
    });
    expect(res.ok).toBe(false);
  });

  it("accepts plausible Blind Stopwatch submission", () => {
    const res = checkScorePlausibility({
      slug: "blind-stopwatch",
      score: 38,
      serverElapsedMs: 11_800,
    });
    expect(res.ok).toBe(true);
  });
});
