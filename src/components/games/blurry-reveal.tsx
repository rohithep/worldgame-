"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { scoreBlurryRevealRound } from "@/lib/scoring";
import { soundFx } from "@/lib/sound";
import { fetchCachedJson } from "@/lib/fetch-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { RoundLogEntry } from "@/lib/plausibility";
import type { GameRenderProps } from "./game-shell";

interface RevealItem {
  id: string;
  answer: string;
  aliases: string[];
  category: string;
  image: string;
}

interface RevealRound {
  item: RevealItem;
  options: RevealItem[];
}

const TOTAL_ROUNDS = 5;
const ROUND_MS = 15_000;

export function BlurryRevealGame({ onFinish }: GameRenderProps) {
  const [rounds, setRounds] = useState<RevealRound[]>([]);
  const [manifestError, setManifestError] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [roundIdx, setRoundIdx] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [typedGuess, setTypedGuess] = useState("");
  const [roundResult, setRoundResult] = useState<{
    correct: boolean;
    points: number;
  } | null>(null);

  const roundStartRef = useRef(0);
  const logRef = useRef<RoundLogEntry[]>([]);
  const resolvedRef = useRef(false);

  // Load manifest of 85 illustrations (cached in memory for 0ms Play Again)
  useEffect(() => {
    let active = true;
    fetchCachedJson<{ items: RevealItem[] }>("/assets/reveal/manifest.json").then(
      (res) => {
        if (!active) return;
        if (!res.ok || !res.data?.items?.length) {
          setManifestError(res.error || "Could not load illustrations.");
          return;
        }
        setManifestError(null);
        const pool = [...res.data.items];
        for (let i = pool.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        const selected = pool.slice(0, TOTAL_ROUNDS);
        const built: RevealRound[] = selected.map((item) => {
          const distractors = res.data!.items
            .filter((x) => x.id !== item.id)
            .sort(() => Math.random() - 0.5)
            .slice(0, 3);
          const options = [item, ...distractors].sort(() => Math.random() - 0.5);
          return { item, options };
        });
        setRounds(built);
        roundStartRef.current = performance.now();
      }
    );
    return () => {
      active = false;
    };
  }, [reloadNonce]);

  const resolveRound = useCallback(
    (correct: boolean, elapsed: number) => {
      if (resolvedRef.current) return;
      resolvedRef.current = true;
      const pts = scoreBlurryRevealRound(elapsed, ROUND_MS, correct);
      logRef.current.push({ ms: Math.round(elapsed), correct, points: pts });
      if (correct) soundFx.correct();
      else soundFx.wrong();
      setRoundResult({ correct, points: pts });
      setTotalScore((s) => s + pts);
    },
    []
  );

  // Preload next round's photo so transitions are instant
  useEffect(() => {
    const nextItem = rounds[roundIdx + 1]?.item;
    if (!nextItem) return;
    const img = new window.Image();
    img.src = nextItem.image;
  }, [rounds, roundIdx]);

  // Timer loop for current round
  useEffect(() => {
    if (rounds.length === 0 || roundResult) return;
    resolvedRef.current = false;
    roundStartRef.current = performance.now();

    const interval = setInterval(() => {
      const elapsed = performance.now() - roundStartRef.current;
      if (elapsed >= ROUND_MS) {
        setElapsedMs(ROUND_MS);
        clearInterval(interval);
        resolveRound(false, ROUND_MS);
      } else {
        setElapsedMs(elapsed);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [rounds.length, roundIdx, roundResult, resolveRound]);

  function handleTypedSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!current || roundResult || !typedGuess.trim()) return;
    const norm = typedGuess.trim().toLowerCase();
    const accepted = [
      current.item.answer.toLowerCase(),
      ...current.item.aliases.map((a) => a.toLowerCase()),
    ];
    const ok = accepted.includes(norm);
    resolveRound(ok, elapsedMs);
  }

  function handleNext() {
    if (roundIdx + 1 >= TOTAL_ROUNDS) {
      const finalScore = logRef.current.reduce((a, r) => a + (r.points ?? 0), 0);
      onFinish(finalScore, logRef.current);
      return;
    }
    setRoundIdx((i) => i + 1);
    setElapsedMs(0);
    setTypedGuess("");
    setRoundResult(null);
  }

  const current = rounds[roundIdx];
  if (manifestError) {
    return (
      <div className="space-y-4 py-14 text-center">
        <p className="text-sm font-medium text-[#FF7A8A]">{manifestError}</p>
        <Button
          type="button"
          size="sm"
          onClick={() => {
            setManifestError(null);
            setReloadNonce((n) => n + 1);
          }}
        >
          Retry
        </Button>
      </div>
    );
  }
  if (!current) {
    return (
      <div className="py-16 text-center text-sm text-[#8E98AA]">
        Loading photos...
      </div>
    );
  }

  const progress = Math.min(1, elapsedMs / ROUND_MS);
  const blurPx = roundResult ? 0 : Math.max(0, (1 - progress) * 34);
  const potentialPts = scoreBlurryRevealRound(elapsedMs, ROUND_MS, true);

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div className="flex items-center justify-between text-sm">
        <span className="rounded-full border border-[#E8A849]/30 bg-[#E8A849]/10 px-3.5 py-1 font-mono text-xs font-semibold tracking-wider text-[#E8A849] uppercase">
          Round {roundIdx + 1} / {TOTAL_ROUNDS} • {current.item.category}
        </span>
        <span className="font-score text-lg font-bold text-[#F4F1EA]">
          Total: <span className="text-[#E8A849]">{totalScore.toLocaleString("en-US")}</span>
        </span>
      </div>

      <div className="relative mx-auto flex aspect-square max-w-[310px] items-center justify-center overflow-hidden rounded-3xl border border-white/15 bg-[#0B0F17] shadow-[0_24px_60px_rgba(0,0,0,0.55)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.item.image}
          alt={roundResult ? current.item.answer : "Blurred mystery photo"}
          className={cn(
            "h-full w-full object-cover transition-[filter,transform] duration-150",
            !roundResult && "scale-110"
          )}
          style={{ filter: `blur(${blurPx.toFixed(1)}px)` }}
        />
        {!roundResult && (
          <span className="font-score absolute right-3 top-3 rounded-full border border-white/15 bg-[#04060A]/80 px-3 py-1 text-xs font-bold text-[#E8A849] backdrop-blur-md">
            +{potentialPts} pts
          </span>
        )}
      </div>

      {roundResult ? (
        <div className="space-y-4 text-center">
          <div
            className={cn(
              "rounded-2xl border p-4",
              roundResult.correct
                ? "border-[#19B37D]/40 bg-[#19B37D]/12"
                : "border-[#E5394D]/40 bg-[#E5394D]/12"
            )}
          >
            <p className="font-heading text-xl font-bold text-[#F4F1EA]">
              {current.item.answer}
            </p>
            <p className="font-score mt-1 text-sm font-bold text-[#C8D0DC]">
              {roundResult.correct
                ? `+${roundResult.points} points!`
                : "0 points — better luck next round"}
            </p>
          </div>
          <Button type="button" size="lg" className="w-full" onClick={handleNext}>
            {roundIdx + 1 >= TOTAL_ROUNDS ? "See Final Score" : "Next Photo →"}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2.5">
            {current.options.map((opt) => (
              <Button
                key={opt.id}
                type="button"
                variant="secondary"
                className="min-h-12 text-sm font-semibold"
                onClick={() =>
                  resolveRound(
                    opt.id === current.item.id,
                    performance.now() - roundStartRef.current
                  )
                }
              >
                {opt.answer}
              </Button>
            ))}
          </div>

          <form onSubmit={handleTypedSubmit} className="flex gap-2">
            <Input
              value={typedGuess}
              onChange={(e) => setTypedGuess(e.target.value)}
              placeholder="Or type your answer..."
              aria-label="Type your guess"
            />
            <Button type="submit" variant="primary">
              Guess
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
