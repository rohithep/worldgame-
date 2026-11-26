"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  GUESS_NUMBER_QUESTIONS,
  type GuessNumberQuestion,
} from "@/data/guess-number-questions";
import { scoreGuessTheNumberRound } from "@/lib/scoring";
import { soundFx } from "@/lib/sound";
import { formatNumber } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { RoundLogEntry } from "@/lib/plausibility";
import type { GameRenderProps } from "./game-shell";

const TOTAL_ROUNDS = 5;

function pickFiveQuestions(): GuessNumberQuestion[] {
  const pool = [...GUESS_NUMBER_QUESTIONS];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, TOTAL_ROUNDS);
}

function sliderToValue(t: number, q: GuessNumberQuestion): number {
  if (q.logScale) {
    const minL = Math.log10(Math.max(1, q.min));
    const maxL = Math.log10(Math.max(2, q.max));
    return Math.round(Math.pow(10, minL + t * (maxL - minL)));
  }
  return Math.round(q.min + t * (q.max - q.min));
}

export function GuessTheNumberGame({ onFinish }: GameRenderProps) {
  const questions = useMemo(() => pickFiveQuestions(), []);
  const [roundIdx, setRoundIdx] = useState(0);
  const [sliderPos, setSliderPos] = useState(0.5); // 0..1
  const [totalScore, setTotalScore] = useState(0);
  const [reveal, setReveal] = useState<{
    guess: number;
    points: number;
  } | null>(null);

  const roundStartRef = useRef<number>(0);
  const logRef = useRef<RoundLogEntry[]>([]);

  useEffect(() => {
    roundStartRef.current = performance.now();
  }, []);

  const current = questions[roundIdx];
  const guessValue = sliderToValue(sliderPos, current);

  function handleLockIn() {
    if (reveal) return;
    const elapsed = Math.round(performance.now() - roundStartRef.current);
    const pts = scoreGuessTheNumberRound(guessValue, current.answer, current.d);
    logRef.current.push({ ms: elapsed, points: pts });

    if (pts >= 600) soundFx.correct();
    else soundFx.click();

    setReveal({ guess: guessValue, points: pts });
    setTotalScore((s) => s + pts);
  }

  function handleNext() {
    if (!reveal) return;
    if (roundIdx + 1 >= TOTAL_ROUNDS) {
      const finalScore = logRef.current.reduce((a, r) => a + (r.points ?? 0), 0);
      onFinish(finalScore, logRef.current);
      return;
    }
    setRoundIdx((i) => i + 1);
    setSliderPos(0.5);
    setReveal(null);
    roundStartRef.current = performance.now();
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex items-center justify-between text-sm">
        <span className="rounded-full bg-[#E7F8F6] px-3.5 py-1 font-bold text-[#0E857A]">
          Round {roundIdx + 1} / {TOTAL_ROUNDS}
        </span>
        <span className="font-score text-lg font-bold text-[#0B1220]">
          Total: <span className="text-[#12B5A6]">{totalScore.toLocaleString("en-US")}</span> / 5,000
        </span>
      </div>

      <div className="rounded-3xl border border-[#E6EAF2] bg-[#F7F9FC] p-6 text-center">
        <h2 className="font-heading text-xl font-bold text-[#0B1220] sm:text-2xl">
          {current.prompt}
        </h2>
        <p className="mt-1.5 text-xs text-[#5B6475]">
          {current.logScale ? "Logarithmic scale slider" : "Linear scale slider"} • Range:{" "}
          {formatNumber(current.min)} – {formatNumber(current.max)} {current.unit}
        </p>

        <p className="font-score mt-6 text-4xl font-extrabold text-[#12B5A6] sm:text-5xl">
          {formatNumber(reveal ? reveal.guess : guessValue)}{" "}
          <span className="text-lg font-semibold text-[#5B6475]">{current.unit}</span>
        </p>

        <div className="mt-6 px-2">
          <input
            type="range"
            min={0}
            max={1000}
            value={Math.round(sliderPos * 1000)}
            disabled={Boolean(reveal)}
            aria-label="Your numerical estimate"
            onChange={(e) => setSliderPos(Number(e.target.value) / 1000)}
            className="h-3 w-full cursor-pointer appearance-none rounded-full bg-[#DCE4F2] accent-[#12B5A6]"
          />
          <div className="mt-2 flex justify-between font-score text-xs text-[#5B6475]">
            <span>{formatNumber(current.min)}</span>
            <span>{formatNumber(current.max)}</span>
          </div>
        </div>
      </div>

      {reveal ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#12B5A6]/35 bg-[#E7F8F6] p-5 text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#0E857A]">
              Exact Answer
            </p>
            <p className="font-score mt-1 text-3xl font-extrabold text-[#0B1220]">
              {formatNumber(current.answer)} {current.unit}
            </p>
            <p className="mt-1 text-xs text-[#5B6475]">
              Source: {current.source} ({current.year})
            </p>
            <p className="font-score mt-3 text-lg font-bold text-[#12B5A6]">
              +{reveal.points.toLocaleString("en-US")} points
            </p>
          </div>
          <Button type="button" size="lg" className="w-full" onClick={handleNext}>
            {roundIdx + 1 >= TOTAL_ROUNDS ? "See Final Score" : "Next Question →"}
          </Button>
        </div>
      ) : (
        <Button type="button" size="lg" className="w-full" onClick={handleLockIn}>
          Lock In Estimate
        </Button>
      )}
    </div>
  );
}
