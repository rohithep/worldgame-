"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { COUNTRIES, type CountryData } from "@/data/countries";
import { CountryFlag } from "@/components/ui/flag";
import { scoreFlagStreak } from "@/lib/scoring";
import { soundFx } from "@/lib/sound";
import { cn } from "@/lib/utils";
import type { RoundLogEntry } from "@/lib/plausibility";
import type { GameRenderProps } from "./game-shell";

interface FlagRound {
  target: CountryData;
  options: CountryData[];
}

function buildRound(streak: number, seenCodes: Set<string>): FlagRound {
  const maxTier = streak < 5 ? 1 : streak < 12 ? 2 : 3;
  let pool = COUNTRIES.filter((c) => c.tier <= maxTier && !seenCodes.has(c.code));
  if (pool.length < 4) {
    pool = COUNTRIES.filter((c) => c.tier <= maxTier);
  }
  const target = pool[Math.floor(Math.random() * pool.length)];

  const distractors: CountryData[] = [];
  const used = new Set([target.code]);
  while (distractors.length < 3) {
    const pick = COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];
    if (!used.has(pick.code)) {
      used.add(pick.code);
      distractors.push(pick);
    }
  }

  const options = [target, ...distractors];
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return { target, options };
}

export function FlagStreakGame({ onFinish }: GameRenderProps) {
  const seenRef = useRef<Set<string>>(new Set());
  const roundStartRef = useRef<number>(0);
  const logRef = useRef<RoundLogEntry[]>([]);

  const [streak, setStreak] = useState(0);
  const [round, setRound] = useState<FlagRound>(() => buildRound(0, new Set()));
  const [pickedCode, setPickedCode] = useState<string | null>(null);

  useEffect(() => {
    roundStartRef.current = performance.now();
  }, []);

  const handleChoice = useCallback(
    (country: CountryData) => {
      if (pickedCode) return;
      const elapsed = Math.round(performance.now() - roundStartRef.current);
      const correct = country.code === round.target.code;

      setPickedCode(country.code);
      logRef.current.push({ ms: elapsed, correct });

      if (correct) {
        soundFx.correct();
        seenRef.current.add(round.target.code);
        const nextStreak = streak + 1;
        setStreak(nextStreak);
        setTimeout(() => {
          setRound(buildRound(nextStreak, seenRef.current));
          setPickedCode(null);
          roundStartRef.current = performance.now();
        }, 620);
      } else {
        soundFx.wrong();
        setTimeout(() => {
          onFinish(scoreFlagStreak(streak), logRef.current);
        }, 950);
      }
    },
    [pickedCode, round.target.code, streak, onFinish]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const idx = Number(e.key) - 1;
      if (idx >= 0 && idx < 4 && round.options[idx]) {
        handleChoice(round.options[idx]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleChoice, round.options]);

  const tierLabel = streak < 5 ? "Starter" : streak < 12 ? "Intermediate" : "World Master";

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-[#E9F9F2] px-3.5 py-1 text-xs font-bold text-[#10825B]">
          Tier: {tierLabel}
        </span>
        <span className="font-score text-lg font-bold text-[#0B1220]">
          Streak: <span className="text-[#19B37D]">{streak}</span>
        </span>
      </div>

      <div className="flex flex-col items-center justify-center rounded-3xl border border-[#E6EAF2] bg-[#F7F9FC] p-8">
        <CountryFlag
          code={round.target.code}
          label="Mystery flag"
          className="h-32 w-48 rounded-xl shadow-[0_14px_30px_-10px_rgba(11,18,32,0.22)] sm:h-40 sm:w-60"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {round.options.map((opt, idx) => {
          const isTarget = opt.code === round.target.code;
          const isPicked = pickedCode === opt.code;

          return (
            <button
              key={opt.code}
              type="button"
              disabled={Boolean(pickedCode)}
              onClick={() => handleChoice(opt)}
              className={cn(
                "arcade-btn arcade-btn-secondary flex min-h-14 items-center gap-3 rounded-2xl px-4 text-left text-sm font-semibold sm:text-base",
                pickedCode && isTarget && "border-[#19B37D] bg-[#E9F9F2] text-[#0E6B4A]",
                isPicked && !isTarget && "border-[#E5394D] bg-[#FFF0F3] text-[#B91C3B]"
              )}
            >
              <span className="font-score flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#EEF2FA] text-xs font-bold text-[#5B6475]">
                {idx + 1}
              </span>
              <span className="truncate">{opt.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
