import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { GAME_BY_SLUG, type GameSlug } from "./constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatScore(slug: GameSlug, score: number): string {
  const game = GAME_BY_SLUG[slug];
  if (!game) return String(score);

  if (slug === "blind-stopwatch") {
    const seconds = score / 1000;
    return `±${seconds.toFixed(3)} s`;
  }
  if (slug === "typing-sprint") {
    return `${Math.round(score)} WPM`;
  }
  if (slug === "blurry-reveal" || slug === "guess-the-number" || slug === "color-whisperer") {
    return `${Math.round(score).toLocaleString("en-US")} pts`;
  }
  if (slug === "higher-or-lower" || slug === "flag-streak") {
    return `${Math.round(score)} streak`;
  }
  if (slug === "math-dash") {
    return `${Math.round(score)} correct`;
  }
  if (slug === "word-scramble") {
    return `${Math.round(score)} words`;
  }
  return `${score} ${game.unit}`;
}

export function formatDateShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatNumber(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
