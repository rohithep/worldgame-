"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  hsbToRgb,
  rgbToHex,
  scoreColorWhispererRound,
  type HSB,
} from "@/lib/scoring";
import { soundFx } from "@/lib/sound";
import { Button } from "@/components/ui/button";
import type { RoundLogEntry } from "@/lib/plausibility";
import type { GameRenderProps } from "./game-shell";

const TOTAL_ROUNDS = 5;
const MEMORIZE_MS = 3_000;

function generateTargets(): HSB[] {
  const targets: HSB[] = [];
  for (let i = 0; i < TOTAL_ROUNDS; i++) {
    targets.push({
      h: Math.floor(Math.random() * 360),
      s: Math.floor(35 + Math.random() * 60),
      b: Math.floor(35 + Math.random() * 60),
    });
  }
  return targets;
}

interface RoundSummary {
  targetHex: string;
  guessHex: string;
  points: number;
  deltaE: number;
}

export function ColorWhispererGame({ onFinish }: GameRenderProps) {
  const targets = useMemo(() => generateTargets(), []);
  const [roundIdx, setRoundIdx] = useState(0);
  const [stage, setStage] = useState<"memorize" | "match" | "reveal">("memorize");
  const [memorizeMsLeft, setMemorizeMsLeft] = useState(MEMORIZE_MS);

  const [guess, setGuess] = useState<HSB>({ h: 180, s: 50, b: 65 });
  const [totalScore, setTotalScore] = useState(0);
  const [summaries, setSummaries] = useState<RoundSummary[]>([]);

  const roundStartRef = useRef(0);
  const logRef = useRef<RoundLogEntry[]>([]);

  const target = targets[roundIdx];
  const targetHex = rgbToHex(hsbToRgb(target));
  const guessHex = rgbToHex(hsbToRgb(guess));

  useEffect(() => {
    if (stage !== "memorize") return;
    const start = performance.now();
    roundStartRef.current = start;

    const interval = setInterval(() => {
      const left = Math.max(0, MEMORIZE_MS - (performance.now() - start));
      setMemorizeMsLeft(left);
      if (left <= 0) {
        clearInterval(interval);
        setStage("match");
      }
    }, 50);

    return () => clearInterval(interval);
  }, [stage, roundIdx]);

  function handleSubmitColor() {
    if (stage !== "match") return;
    const elapsed = Math.round(performance.now() - roundStartRef.current);
    const { points, deltaE } = scoreColorWhispererRound(target, guess);
    logRef.current.push({ ms: elapsed, points });

    if (points >= 750) soundFx.correct();
    else soundFx.click();

    setTotalScore((s) => s + points);
    setSummaries((prev) => [...prev, { targetHex, guessHex, points, deltaE }]);
    setStage("reveal");
  }

  function handleNext() {
    if (roundIdx + 1 >= TOTAL_ROUNDS) {
      const finalScore = logRef.current.reduce((a, r) => a + (r.points ?? 0), 0);
      const pct = Math.round((finalScore / 5000) * 1000) / 10;
      const allSummaries = summaries;

      onFinish(
        finalScore,
        logRef.current,
        <div className="space-y-3">
          <p className="font-score text-sm font-bold text-[#2F6BFF]">
            Overall Perceptual Accuracy: {pct}%
          </p>
          <div className="grid grid-cols-5 gap-2">
            {allSummaries.map((s, idx) => (
              <div
                key={idx}
                className="overflow-hidden rounded-xl border border-[#E6EAF2] bg-white p-1.5 text-center"
              >
                <div className="grid grid-cols-2 overflow-hidden rounded-lg">
                  <div className="h-10" style={{ backgroundColor: s.targetHex }} title="Target" />
                  <div className="h-10" style={{ backgroundColor: s.guessHex }} title="Yours" />
                </div>
                <p className="font-score mt-1 text-[11px] font-bold text-[#0B1220]">
                  {s.points}
                </p>
              </div>
            ))}
          </div>
        </div>
      );
      return;
    }

    setRoundIdx((i) => i + 1);
    setGuess({ h: 180, s: 50, b: 65 });
    setMemorizeMsLeft(MEMORIZE_MS);
    setStage("memorize");
  }

  const latestSummary = summaries[summaries.length - 1];

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="flex items-center justify-between text-sm">
        <span className="rounded-full bg-[#EEF3FF] px-3.5 py-1 font-bold text-[#2F6BFF]">
          Round {roundIdx + 1} / {TOTAL_ROUNDS}
        </span>
        <span className="font-score text-lg font-bold text-[#0B1220]">
          Total: <span className="text-[#2F6BFF]">{totalScore.toLocaleString("en-US")}</span> / 5,000
        </span>
      </div>

      {stage === "memorize" && (
        <div className="space-y-4 text-center">
          <p className="font-heading text-lg font-bold text-[#0B1220]">
            Memorize this color ({(memorizeMsLeft / 1000).toFixed(1)}s)
          </p>
          <div
            className="mx-auto h-52 w-full rounded-3xl border border-black/10 shadow-[0_18px_40px_-14px_rgba(11,18,32,0.22)]"
            style={{ backgroundColor: targetHex }}
          />
        </div>
      )}

      {stage === "match" && (
        <div className="space-y-5">
          <div
            className="mx-auto h-44 w-full rounded-3xl border border-black/10 shadow-[0_16px_36px_-12px_rgba(11,18,32,0.18)]"
            style={{ backgroundColor: guessHex }}
          />

          <div className="space-y-4 rounded-2xl border border-[#E6EAF2] bg-[#F7F9FC] p-5">
            <div>
              <div className="mb-1.5 flex justify-between text-xs font-semibold text-[#5B6475]">
                <label htmlFor="cw-hue">Hue</label>
                <span className="font-score">{guess.h}°</span>
              </div>
              <input
                id="cw-hue"
                type="range"
                min={0}
                max={359}
                value={guess.h}
                onChange={(e) => setGuess((g) => ({ ...g, h: Number(e.target.value) }))}
                className="h-3.5 w-full cursor-pointer appearance-none rounded-full"
                style={{
                  background:
                    "linear-gradient(to right, #FF0000, #FFFF00, #00FF00, #00FFFF, #0000FF, #FF00FF, #FF0000)",
                }}
              />
            </div>

            <div>
              <div className="mb-1.5 flex justify-between text-xs font-semibold text-[#5B6475]">
                <label htmlFor="cw-sat">Saturation</label>
                <span className="font-score">{guess.s}%</span>
              </div>
              <input
                id="cw-sat"
                type="range"
                min={0}
                max={100}
                value={guess.s}
                onChange={(e) => setGuess((g) => ({ ...g, s: Number(e.target.value) }))}
                className="h-3.5 w-full cursor-pointer appearance-none rounded-full bg-[#DCE4F2] accent-[#2F6BFF]"
              />
            </div>

            <div>
              <div className="mb-1.5 flex justify-between text-xs font-semibold text-[#5B6475]">
                <label htmlFor="cw-bri">Brightness</label>
                <span className="font-score">{guess.b}%</span>
              </div>
              <input
                id="cw-bri"
                type="range"
                min={0}
                max={100}
                value={guess.b}
                onChange={(e) => setGuess((g) => ({ ...g, b: Number(e.target.value) }))}
                className="h-3.5 w-full cursor-pointer appearance-none rounded-full bg-[#DCE4F2] accent-[#2F6BFF]"
              />
            </div>
          </div>

          <Button type="button" size="lg" className="w-full" onClick={handleSubmitColor}>
            Lock In Color
          </Button>
        </div>
      )}

      {stage === "reveal" && latestSummary && (
        <div className="space-y-5 text-center">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div
                className="h-36 rounded-3xl border border-black/10 shadow-sm"
                style={{ backgroundColor: latestSummary.targetHex }}
              />
              <p className="text-xs font-semibold text-[#5B6475]">
                Target ({latestSummary.targetHex})
              </p>
            </div>
            <div className="space-y-2">
              <div
                className="h-36 rounded-3xl border border-black/10 shadow-sm"
                style={{ backgroundColor: latestSummary.guessHex }}
              />
              <p className="text-xs font-semibold text-[#5B6475]">
                Yours ({latestSummary.guessHex})
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-[#E6EAF2] bg-[#F7F9FC] p-4">
            <p className="font-score text-2xl font-extrabold text-[#2F6BFF]">
              +{latestSummary.points} pts
            </p>
            <p className="text-xs text-[#5B6475]">
              CIEDE2000 ΔE = {latestSummary.deltaE} •{" "}
              {Math.round(latestSummary.points / 10)}% match
            </p>
          </div>

          <Button type="button" size="lg" className="w-full" onClick={handleNext}>
            {roundIdx + 1 >= TOTAL_ROUNDS ? "See Final Score" : "Next Color →"}
          </Button>
        </div>
      )}
    </div>
  );
}
