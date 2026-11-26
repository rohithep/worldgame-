"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { COUNTRIES, COUNTRIES_DATA_YEAR, type CountryData } from "@/data/countries";
import { CountryFlag } from "@/components/ui/flag";
import { scoreHigherOrLower } from "@/lib/scoring";
import { soundFx } from "@/lib/sound";
import { cn, formatNumber } from "@/lib/utils";
import type { RoundLogEntry } from "@/lib/plausibility";
import type { GameRenderProps } from "./game-shell";

type Metric = "population" | "areaKm2";

interface PairState {
  left: CountryData;
  right: CountryData;
  metric: Metric;
}

function pickPair(excludeCodes: string[] = []): PairState {
  const metric: Metric = Math.random() < 0.5 ? "population" : "areaKm2";
  for (let tries = 0; tries < 200; tries++) {
    const a = COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];
    const b = COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];
    if (a.code === b.code) continue;
    if (excludeCodes.includes(a.code) && excludeCodes.includes(b.code)) continue;
    const va = a[metric];
    const vb = b[metric];
    const ratio = Math.max(va, vb) / Math.max(1, Math.min(va, vb));
    // Ensure pair values differ by at least 10%
    if (ratio >= 1.1) {
      return { left: a, right: b, metric };
    }
  }
  return { left: COUNTRIES[0], right: COUNTRIES[2], metric: "population" };
}

function CountUpNumber({ target, suffix }: { target: number; suffix: string }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const duration = 550;
    let raf = 0;
    const frame = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  return (
    <span className="font-score text-xl font-extrabold text-[#0B1220] sm:text-2xl">
      {formatNumber(val)} {suffix}
    </span>
  );
}

export function HigherOrLowerGame({ onFinish }: GameRenderProps) {
  const [pair, setPair] = useState<PairState>(() => pickPair());
  const [streak, setStreak] = useState(0);
  const [revealed, setRevealed] = useState<"left" | "right" | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const roundStartRef = useRef<number>(0);
  const logRef = useRef<RoundLogEntry[]>([]);

  useEffect(() => {
    roundStartRef.current = performance.now();
  }, []);

  const handlePick = useCallback(
    (side: "left" | "right") => {
      if (revealed) return;
      const elapsed = Math.round(performance.now() - roundStartRef.current);
      const leftVal = pair.left[pair.metric];
      const rightVal = pair.right[pair.metric];
      const correct =
        side === "left" ? leftVal >= rightVal : rightVal >= leftVal;

      setRevealed(side);
      setIsCorrect(correct);
      logRef.current.push({ ms: elapsed, correct });

      if (correct) {
        soundFx.correct();
        const nextStreak = streak + 1;
        setStreak(nextStreak);
        setTimeout(() => {
          setPair(pickPair([pair.left.code, pair.right.code]));
          setRevealed(null);
          setIsCorrect(null);
          roundStartRef.current = performance.now();
        }, 1050);
      } else {
        soundFx.wrong();
        setTimeout(() => {
          onFinish(scoreHigherOrLower(streak), logRef.current);
        }, 1250);
      }
    },
    [revealed, pair, streak, onFinish]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "1") handlePick("left");
      if (e.key === "ArrowRight" || e.key === "2") handlePick("right");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handlePick]);

  const question =
    pair.metric === "population"
      ? "Which country has more people?"
      : "Which country has a bigger land area?";
  const unitSuffix = pair.metric === "population" ? "people" : "km²";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-[#FFF1EC] px-3.5 py-1 text-xs font-bold text-[#D95532]">
          UN Data ({COUNTRIES_DATA_YEAR})
        </span>
        <div className="font-score text-lg font-bold text-[#0B1220]">
          Streak: <span className="text-[#FF7A59]">{streak}</span>
        </div>
      </div>

      <h2 className="text-center font-heading text-xl font-bold text-[#0B1220] sm:text-2xl">
        {question}
      </h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {(["left", "right"] as const).map((side) => {
          const country = pair[side];
          const val = country[pair.metric];
          const picked = revealed === side;
          const winner =
            pair.left[pair.metric] > pair.right[pair.metric] ? "left" : "right";

          return (
            <button
              key={country.code}
              type="button"
              disabled={Boolean(revealed)}
              onClick={() => handlePick(side)}
              className={cn(
                "arcade-card flex min-h-52 flex-col items-center justify-center gap-4 p-6 text-center transition-all hover:border-[#FF7A59] hover:shadow-md focus-visible:ring-2",
                revealed && side === winner && "border-[#19B37D] bg-[#19B37D]/15",
                picked && isCorrect === false && "border-[#E5394D] bg-[#E5394D]/15"
              )}
            >
              <CountryFlag
                code={country.code}
                label={country.name}
                className="h-16 w-24 rounded-lg shadow-md"
              />
              <span className="font-heading text-xl font-bold text-[#0B1220]">
                {country.name}
              </span>
              <div className="h-8">
                {revealed ? (
                  <CountUpNumber target={val} suffix={unitSuffix} />
                ) : (
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#5B6475]">
                    Tap or press {side === "left" ? "←" : "→"}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
