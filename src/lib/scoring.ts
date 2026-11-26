import type { ScoreDirection } from "./constants";

export function scoreBlindStopwatch(elapsedMs: number): number {
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) return 30000;
  return Math.round(Math.abs(elapsedMs - 10000));
}

export function scoreHigherOrLower(streak: number): number {
  return Math.max(0, Math.floor(streak));
}

export function scoreFlagStreak(streak: number): number {
  return Math.max(0, Math.floor(streak));
}

export function scoreMathDash(correctCount: number): number {
  return Math.max(0, Math.floor(correctCount));
}

export function scoreWordScramble(wordsSolved: number): number {
  return Math.max(0, Math.floor(wordsSolved));
}

/**
 * Typing Sprint: Net WPM = (correctChars / 5) / minutes - accuracy penalty.
 * Clamped to [0, 250].
 */
export function scoreTypingSprint(
  correctChars: number,
  totalTypedChars: number,
  durationSec = 30
): { netWpm: number; rawWpm: number; accuracy: number } {
  const safeCorrect = Math.max(0, correctChars);
  const safeTotal = Math.max(safeCorrect, totalTypedChars);
  const minutes = Math.max(durationSec / 60, 0.01);

  const accuracy = safeTotal === 0 ? 100 : (safeCorrect / safeTotal) * 100;
  const rawWpm = safeCorrect / 5 / minutes;
  const incorrectChars = safeTotal - safeCorrect;
  // Accuracy penalty: subtract 1 WPM per 2 uncorrected/incorrect keystrokes
  const penalty = incorrectChars / 2 / minutes;
  const netWpm = Math.max(0, Math.min(250, Math.round(rawWpm - penalty)));

  return {
    netWpm,
    rawWpm: Math.round(rawWpm),
    accuracy: Math.round(accuracy * 10) / 10,
  };
}

/**
 * Blurry Reveal: up to 1000 points per round, decreasing smoothly over 15s.
 * Wrong or missed guess scores 0.
 */
export function scoreBlurryRevealRound(
  elapsedMs: number,
  maxMs = 15000,
  correct = true
): number {
  if (!correct) return 0;
  const clamped = Math.max(0, Math.min(maxMs, elapsedMs));
  const ratio = 1 - clamped / maxMs;
  // Minimum 100 points if answered right at the buzzer
  return Math.round(100 + 900 * ratio);
}

/**
 * Guess the Number: 1000 * max(0, 1 - |log10(guess) - log10(answer)| / D)
 */
export function scoreGuessTheNumberRound(
  guess: number,
  answer: number,
  d = 1
): number {
  if (guess <= 0 || answer <= 0 || d <= 0) return 0;
  const diff = Math.abs(Math.log10(guess) - Math.log10(answer));
  const raw = 1000 * Math.max(0, 1 - diff / d);
  return Math.round(raw);
}

// ============================================================================
// Color Whisperer: HSB -> RGB -> XYZ -> CIELAB -> CIEDE2000
// ============================================================================

export interface HSB {
  h: number; // 0..360
  s: number; // 0..100
  b: number; // 0..100
}

export interface RGB {
  r: number; // 0..255
  g: number; // 0..255
  b: number; // 0..255
}

export function hsbToRgb({ h, s, b }: HSB): RGB {
  const hue = ((h % 360) + 360) % 360;
  const sat = Math.max(0, Math.min(100, s)) / 100;
  const val = Math.max(0, Math.min(100, b)) / 100;

  const c = val * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = val - c;

  let r1 = 0,
    g1 = 0,
    b1 = 0;

  if (hue < 60) [r1, g1, b1] = [c, x, 0];
  else if (hue < 120) [r1, g1, b1] = [x, c, 0];
  else if (hue < 180) [r1, g1, b1] = [0, c, x];
  else if (hue < 240) [r1, g1, b1] = [0, x, c];
  else if (hue < 300) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];

  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  };
}

export function rgbToHex({ r, g, b }: RGB): string {
  const toHex = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function rgbToLab({ r, g, b }: RGB): { L: number; a: number; b: number } {
  const linearize = (v: number) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };

  const rl = linearize(r);
  const gl = linearize(g);
  const bl = linearize(b);

  // sRGB D65 -> XYZ
  const X = (rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375) / 0.95047;
  const Y = (rl * 0.2126729 + gl * 0.7151522 + bl * 0.072175) / 1.0;
  const Z = (rl * 0.0193339 + gl * 0.119192 + bl * 0.9503041) / 1.08883;

  const f = (t: number) =>
    t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;

  const fx = f(X);
  const fy = f(Y);
  const fz = f(Z);

  return {
    L: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };
}

/**
 * Exact CIEDE2000 perceptual color difference between two RGB colors.
 */
export function ciede2000(rgb1: RGB, rgb2: RGB): number {
  const lab1 = rgbToLab(rgb1);
  const lab2 = rgbToLab(rgb2);

  const rad = (deg: number) => (deg * Math.PI) / 180;
  const deg = (r: number) => (r * 180) / Math.PI;

  const C1 = Math.sqrt(lab1.a * lab1.a + lab1.b * lab1.b);
  const C2 = Math.sqrt(lab2.a * lab2.a + lab2.b * lab2.b);
  const avgC = (C1 + C2) / 2;

  const avgC7 = Math.pow(avgC, 7);
  const G = 0.5 * (1 - Math.sqrt(avgC7 / (avgC7 + Math.pow(25, 7))));

  const a1p = (1 + G) * lab1.a;
  const a2p = (1 + G) * lab2.a;
  const C1p = Math.sqrt(a1p * a1p + lab1.b * lab1.b);
  const C2p = Math.sqrt(a2p * a2p + lab2.b * lab2.b);

  const huePrime = (bp: number, ap: number) => {
    if (bp === 0 && ap === 0) return 0;
    const h = deg(Math.atan2(bp, ap));
    return h >= 0 ? h : h + 360;
  };

  const h1p = huePrime(lab1.b, a1p);
  const h2p = huePrime(lab2.b, a2p);

  const dLp = lab2.L - lab1.L;
  const dCp = C2p - C1p;

  let dhp = 0;
  if (C1p * C2p !== 0) {
    if (Math.abs(h2p - h1p) <= 180) dhp = h2p - h1p;
    else if (h2p - h1p > 180) dhp = h2p - h1p - 360;
    else dhp = h2p - h1p + 360;
  }

  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(rad(dhp / 2));

  const avgLp = (lab1.L + lab2.L) / 2;
  const avgCp = (C1p + C2p) / 2;

  let avghp = h1p + h2p;
  if (C1p * C2p !== 0) {
    if (Math.abs(h1p - h2p) <= 180) avghp = (h1p + h2p) / 2;
    else if (h1p + h2p < 360) avghp = (h1p + h2p + 360) / 2;
    else avghp = (h1p + h2p - 360) / 2;
  }

  const T =
    1 -
    0.17 * Math.cos(rad(avghp - 30)) +
    0.24 * Math.cos(rad(2 * avghp)) +
    0.32 * Math.cos(rad(3 * avghp + 6)) -
    0.2 * Math.cos(rad(4 * avghp - 63));

  const dTheta = 30 * Math.exp(-Math.pow((avghp - 275) / 25, 2));
  const avgCp7 = Math.pow(avgCp, 7);
  const RC = 2 * Math.sqrt(avgCp7 / (avgCp7 + Math.pow(25, 7)));

  const avgLp50Sq = Math.pow(avgLp - 50, 2);
  const SL = 1 + (0.015 * avgLp50Sq) / Math.sqrt(20 + avgLp50Sq);
  const SC = 1 + 0.045 * avgCp;
  const SH = 1 + 0.015 * avgCp * T;
  const RT = -Math.sin(rad(2 * dTheta)) * RC;

  const termL = dLp / SL;
  const termC = dCp / SC;
  const termH = dHp / SH;

  return Math.sqrt(
    termL * termL + termC * termC + termH * termH + RT * termC * termH
  );
}

export function scoreColorWhispererRound(
  target: HSB,
  guess: HSB
): { points: number; deltaE: number } {
  const deltaE = ciede2000(hsbToRgb(target), hsbToRgb(guess));
  const points = Math.round(1000 * Math.max(0, 1 - deltaE / 50));
  return { points, deltaE: Math.round(deltaE * 10) / 10 };
}

/**
 * Deterministic leaderboard comparator:
 * 1) Best score (higher or lower depending on game)
 * 2) Earlier achievedAt
 * 3) Lexicographically smaller userId
 */
export function compareRankEntries(
  a: { bestScore: number; achievedAt: string; userId: string },
  b: { bestScore: number; achievedAt: string; userId: string },
  direction: ScoreDirection
): number {
  if (a.bestScore !== b.bestScore) {
    return direction === "higher"
      ? b.bestScore - a.bestScore
      : a.bestScore - b.bestScore;
  }
  const timeA = new Date(a.achievedAt).getTime();
  const timeB = new Date(b.achievedAt).getTime();
  if (timeA !== timeB) {
    return timeA - timeB;
  }
  return a.userId.localeCompare(b.userId);
}
