"use client";

import type { GameSlug } from "@/lib/constants";
import { GameShell, type GameRenderProps } from "./game-shell";
import { BlindStopwatchGame } from "./blind-stopwatch";
import { HigherOrLowerGame } from "./higher-or-lower";
import { MathDashGame } from "./math-dash";
import { GuessTheNumberGame } from "./guess-the-number";
import { FlagStreakGame } from "./flag-streak";
import { TypingSprintGame } from "./typing-sprint";
import { WordScrambleGame } from "./word-scramble";
import { BlurryRevealGame } from "./blurry-reveal";
import { ColorWhispererGame } from "./color-whisperer";

interface GameRunnerProps {
  slug: GameSlug;
  player: {
    id: string;
    username: string;
    usernameDisplay: string;
    countryCode: string;
    countryName: string;
  } | null;
  initialPersonalBest: number | null;
  initialRank: number | null;
}

const GAME_COMPONENTS: Record<GameSlug, React.ComponentType<GameRenderProps>> = {
  "higher-or-lower": HigherOrLowerGame,
  "flag-streak": FlagStreakGame,
  "typing-sprint": TypingSprintGame,
  "math-dash": MathDashGame,
  "word-scramble": WordScrambleGame,
  "blind-stopwatch": BlindStopwatchGame,
  "blurry-reveal": BlurryRevealGame,
  "guess-the-number": GuessTheNumberGame,
  "color-whisperer": ColorWhispererGame,
};

export function GameRunner(props: GameRunnerProps) {
  const GameComponent = GAME_COMPONENTS[props.slug];
  return (
    <GameShell
      slug={props.slug}
      player={props.player}
      initialPersonalBest={props.initialPersonalBest}
      initialRank={props.initialRank}
      GameComponent={GameComponent}
    />
  );
}
