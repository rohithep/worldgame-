export const SITE_NAME = "World Scoreboard Arcade";

export const MIN_AGE = Number(process.env.NEXT_PUBLIC_MIN_AGE ?? 13);

export const MAX_LOGIN_ATTEMPTS = 5;
export const LOCKOUT_MINUTES = 15;

export type GameSlug =
  | "higher-or-lower"
  | "flag-streak"
  | "typing-sprint"
  | "math-dash"
  | "word-scramble"
  | "blind-stopwatch"
  | "blurry-reveal"
  | "guess-the-number"
  | "color-whisperer";

export type ScoreDirection = "higher" | "lower";

export interface GameDefinition {
  slug: GameSlug;
  name: string;
  shortDesc: string;
  rules: string[];
  accent: string;
  accentSoft: string;
  gradient: string;
  isRotatingHue?: boolean;
  scoreDirection: ScoreDirection;
  unit: string;
  unitLabel: string;
  minValid: number;
  maxValid: number;
  minMsPerUnit: number;
  minDurationMs: number;
  assetPng: string;
  asset3d: string;
  badge?: string;
}

export const GAMES: GameDefinition[] = [
  {
    slug: "higher-or-lower",
    name: "Higher or Lower",
    shortDesc: "Compare two countries by population or land area. One miss ends your streak.",
    rules: [
      "Two countries appear with their flags and a question: population or land area.",
      "Pick which country has the larger value. Pairs always differ by at least 10%.",
      "Keep your streak alive as long as you can — first wrong answer ends the run.",
    ],
    accent: "#FF7A59",
    accentSoft: "#FFF1EC",
    gradient: "linear-gradient(135deg, #FF7A59 0%, #FF9F7A 100%)",
    scoreDirection: "higher",
    unit: "streak",
    unitLabel: "Streak",
    minValid: 0,
    maxValid: 500,
    minMsPerUnit: 350,
    minDurationMs: 1000,
    assetPng: "/assets/png/globe.png",
    asset3d: "/assets/3d/globe.glb",
  },
  {
    slug: "flag-streak",
    name: "Flag Streak",
    shortDesc: "Identify world flags from 4 choices as difficulty ramps up.",
    rules: [
      "A crisp SVG flag appears with 4 country options.",
      "Starts with well-known flags and climbs into tougher territories.",
      "One wrong pick ends your streak. Highest streak wins.",
    ],
    accent: "#19B37D",
    accentSoft: "#E9F9F2",
    gradient: "linear-gradient(135deg, #19B37D 0%, #48D6A4 100%)",
    scoreDirection: "higher",
    unit: "streak",
    unitLabel: "Streak",
    minValid: 0,
    maxValid: 250,
    minMsPerUnit: 400,
    minDurationMs: 1000,
    assetPng: "/assets/png/flag-pole.png",
    asset3d: "/assets/3d/flag-pole.glb",
  },
  {
    slug: "typing-sprint",
    name: "Typing Sprint",
    shortDesc: "30 seconds of pure speed and accuracy on common English words.",
    rules: [
      "Type the highlighted words as fast and cleanly as you can for 30 seconds.",
      "Score is Net WPM: (correct characters / 5) per minute minus an accuracy penalty.",
      "Highest Net WPM wins. Scores above 250 WPM are rejected.",
    ],
    accent: "#7C5CFF",
    accentSoft: "#F1EEFF",
    gradient: "linear-gradient(135deg, #7C5CFF 0%, #A58EFF 100%)",
    scoreDirection: "higher",
    unit: "WPM",
    unitLabel: "Net WPM",
    minValid: 0,
    maxValid: 250,
    minMsPerUnit: 0,
    minDurationMs: 27000,
    assetPng: "/assets/png/keycap.png",
    asset3d: "/assets/3d/keycap.glb",
    badge: "30s sprint",
  },
  {
    slug: "math-dash",
    name: "Math Dash",
    shortDesc: "30 seconds of rapid-fire arithmetic that heats up as you go.",
    rules: [
      "Solve addition, subtraction, and multiplication prompts for 30 seconds.",
      "Difficulty ramps up every 5 correct answers.",
      "Use your keyboard or the on-screen number pad. Most correct answers wins.",
    ],
    accent: "#FFB020",
    accentSoft: "#FFF7E6",
    gradient: "linear-gradient(135deg, #FFB020 0%, #FFCA5C 100%)",
    scoreDirection: "higher",
    unit: "correct",
    unitLabel: "Correct",
    minValid: 0,
    maxValid: 150,
    minMsPerUnit: 200,
    minDurationMs: 27000,
    assetPng: "/assets/png/calculator.png",
    asset3d: "/assets/3d/calculator.glb",
  },
  {
    slug: "word-scramble",
    name: "Word Scramble",
    shortDesc: "Unscramble 4 to 8 letter words in 60 seconds. Hints unlock at 8s.",
    rules: [
      "Unscramble as many common English words as you can in 60 seconds.",
      "An optional first-letter hint unlocks after 8 seconds on a word.",
      "Skipping costs 2 seconds on the clock. Most words solved wins.",
    ],
    accent: "#FF4D8D",
    accentSoft: "#FFEEF4",
    gradient: "linear-gradient(135deg, #FF4D8D 0%, #FF82AF 100%)",
    scoreDirection: "higher",
    unit: "words",
    unitLabel: "Words",
    minValid: 0,
    maxValid: 120,
    minMsPerUnit: 400,
    minDurationMs: 55000,
    assetPng: "/assets/png/letter-tiles.png",
    asset3d: "/assets/3d/letter-tiles.glb",
  },
  {
    slug: "blind-stopwatch",
    name: "Blind Stopwatch",
    shortDesc: "The timer vanishes at 2s. Tap at exactly 10.000 seconds. Lowest miss wins.",
    rules: [
      "Start the timer. After 2.000 seconds, the display disappears.",
      "Count in your head and tap (or press Space) at exactly 10.000 seconds.",
      "Your score is your miss in milliseconds — lowest wins! Switching tabs voids the run.",
    ],
    accent: "#00B8D9",
    accentSoft: "#E6F9FC",
    gradient: "linear-gradient(135deg, #00B8D9 0%, #4CD9F0 100%)",
    scoreDirection: "lower",
    unit: "ms",
    unitLabel: "Miss",
    minValid: 0,
    maxValid: 30000,
    minMsPerUnit: 0,
    minDurationMs: 2000,
    assetPng: "/assets/png/stopwatch.png",
    asset3d: "/assets/3d/stopwatch.glb",
    badge: "Lowest wins",
  },
  {
    slug: "blurry-reveal",
    name: "Blurry Reveal",
    shortDesc: "5 rounds. Guess the sharpening real photo as early as you can.",
    rules: [
      "Each round starts heavily blurred and sharpens smoothly over 15 seconds.",
      "Pick from 4 options or type your answer early for up to 1,000 points per round.",
      "Wrong or missed guesses score 0. Highest total out of 5,000 wins.",
    ],
    accent: "#6C8CFF",
    accentSoft: "#EEF2FF",
    gradient: "linear-gradient(135deg, #6C8CFF 0%, #9BB2FF 100%)",
    scoreDirection: "higher",
    unit: "pts",
    unitLabel: "Points",
    minValid: 0,
    maxValid: 5000,
    minMsPerUnit: 0,
    minDurationMs: 2000,
    assetPng: "/assets/png/magnifier.png",
    asset3d: "/assets/3d/magnifier.glb",
  },
  {
    slug: "guess-the-number",
    name: "Guess the Number",
    shortDesc: "5 real-world trivia numbers estimated with a precision slider.",
    rules: [
      "5 rounds of verified world facts — from mountain heights to ocean depths.",
      "Slide to your best estimate (wide ranges use a logarithmic scale).",
      "Score up to 1,000 points per round based on log-scale closeness. Max 5,000.",
    ],
    accent: "#12B5A6",
    accentSoft: "#E7F8F6",
    gradient: "linear-gradient(135deg, #12B5A6 0%, #4AD6C8 100%)",
    scoreDirection: "higher",
    unit: "pts",
    unitLabel: "Points",
    minValid: 0,
    maxValid: 5000,
    minMsPerUnit: 0,
    minDurationMs: 3000,
    assetPng: "/assets/png/ruler-slider.png",
    asset3d: "/assets/3d/ruler-slider.glb",
  },
  {
    slug: "color-whisperer",
    name: "Color Whisperer",
    shortDesc: "Memorize a target color for 3 seconds, then recreate it with HSB sliders.",
    rules: [
      "Study the target color swatch for 3 seconds before it hides.",
      "Match it from memory using Hue, Saturation, and Brightness sliders.",
      "Scored over 5 rounds using perceptual CIEDE2000 color distance. Max 5,000.",
    ],
    accent: "#2F6BFF",
    accentSoft: "#EEF3FF",
    gradient: "linear-gradient(135deg, #FF4D8D 0%, #FFB020 35%, #19B37D 70%, #2F6BFF 100%)",
    isRotatingHue: true,
    scoreDirection: "higher",
    unit: "pts",
    unitLabel: "Points",
    minValid: 0,
    maxValid: 5000,
    minMsPerUnit: 0,
    minDurationMs: 15000,
    assetPng: "/assets/png/color-swatch.png",
    asset3d: "/assets/3d/color-swatch.glb",
  },
];

export const GAME_BY_SLUG: Record<GameSlug, GameDefinition> = Object.fromEntries(
  GAMES.map((g) => [g.slug, g])
) as Record<GameSlug, GameDefinition>;

export function isGameSlug(slug: string): slug is GameSlug {
  return slug in GAME_BY_SLUG;
}
