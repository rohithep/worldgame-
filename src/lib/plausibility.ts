import { GAME_BY_SLUG, type GameSlug } from "./constants";

export interface RoundLogEntry {
  ms: number;
  correct?: boolean;
  points?: number;
}

export interface PlausibilityInput {
  slug: GameSlug;
  score: number;
  serverElapsedMs: number;
  roundLog?: RoundLogEntry[];
}

export interface PlausibilityResult {
  ok: boolean;
  reason?: string;
}

export function checkScorePlausibility(input: PlausibilityInput): PlausibilityResult {
  const game = GAME_BY_SLUG[input.slug];
  if (!game) {
    return { ok: false, reason: "unknown_game" };
  }

  const { score, serverElapsedMs, roundLog = [] } = input;

  if (!Number.isFinite(score)) {
    return { ok: false, reason: "non_finite_score" };
  }

  if (score < game.minValid || score > game.maxValid) {
    return { ok: false, reason: "out_of_bounds" };
  }

  // Max session age: 30 minutes
  if (serverElapsedMs < 0 || serverElapsedMs > 30 * 60 * 1000) {
    return { ok: false, reason: "invalid_elapsed" };
  }

  // Minimum game duration check (30s games cannot finish in 10s, etc.)
  if (serverElapsedMs < game.minDurationMs) {
    return { ok: false, reason: "too_fast_overall" };
  }

  // Minimum time per scored unit
  if (game.minMsPerUnit > 0 && score > 0) {
    const requiredMs = score * game.minMsPerUnit;
    if (serverElapsedMs < requiredMs) {
      return { ok: false, reason: "too_fast_for_score" };
    }
  }

  // Per-round human reaction time checks
  if (input.slug === "flag-streak" && roundLog.length > 0) {
    const tooFast = roundLog.some((r) => r.correct && r.ms < 400);
    if (tooFast) return { ok: false, reason: "flag_round_too_fast" };
  }

  if (input.slug === "higher-or-lower" && roundLog.length > 0) {
    const tooFast = roundLog.some((r) => r.correct && r.ms < 350);
    if (tooFast) return { ok: false, reason: "hol_round_too_fast" };
  }

  if (input.slug === "blind-stopwatch") {
    // Player claims to have stopped around 10,000 ms +/- score ms.
    // Server elapsed must be at least (10000 - score - 1500ms network/countdown slack)
    const minExpected = Math.max(2000, 10000 - score - 1500);
    if (serverElapsedMs < minExpected) {
      return { ok: false, reason: "stopwatch_elapsed_mismatch" };
    }
  }

  if (input.slug === "typing-sprint" && score > 250) {
    return { ok: false, reason: "wpm_exceeds_limit" };
  }

  if (
    (input.slug === "blurry-reveal" ||
      input.slug === "guess-the-number" ||
      input.slug === "color-whisperer") &&
    roundLog.length > 0
  ) {
    if (roundLog.length > 5) {
      return { ok: false, reason: "too_many_rounds" };
    }
    const sumPoints = roundLog.reduce((acc, r) => acc + (r.points ?? 0), 0);
    if (Math.abs(sumPoints - score) > 5) {
      return { ok: false, reason: "round_sum_mismatch" };
    }
  }

  return { ok: true };
}
