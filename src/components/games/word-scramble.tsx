"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Lightbulb, SkipForward } from "lucide-react";
import { SCRAMBLE_WORDS } from "@/data/scramble-words";
import { scoreWordScramble } from "@/lib/scoring";
import { soundFx } from "@/lib/sound";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { RoundLogEntry } from "@/lib/plausibility";
import type { GameRenderProps } from "./game-shell";

const DURATION_MS = 60_000;
const SKIP_PENALTY_MS = 2_000;
const HINT_UNLOCK_MS = 8_000;

function scrambleWord(word: string): string {
  const letters = word.split("");
  for (let tries = 0; tries < 12; tries++) {
    for (let i = letters.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [letters[i], letters[j]] = [letters[j], letters[i]];
    }
    if (letters.join("") !== word) return letters.join("");
  }
  return letters.reverse().join("");
}

function pickWord(used: Set<string>): { word: string; scrambled: string } {
  for (let i = 0; i < 40; i++) {
    const w = SCRAMBLE_WORDS[Math.floor(Math.random() * SCRAMBLE_WORDS.length)];
    if (!used.has(w)) {
      used.add(w);
      return { word: w, scrambled: scrambleWord(w) };
    }
  }
  const fallback = SCRAMBLE_WORDS[0];
  return { word: fallback, scrambled: scrambleWord(fallback) };
}

export function WordScrambleGame({ onFinish }: GameRenderProps) {
  const usedRef = useRef<Set<string>>(new Set());
  const [current, setCurrent] = useState(() => pickWord(new Set()));
  const [guess, setGuess] = useState("");
  const [solved, setSolved] = useState(0);
  const [timeLeftMs, setTimeLeftMs] = useState(DURATION_MS);
  const [wordElapsedMs, setWordElapsedMs] = useState(0);
  const [showHint, setShowHint] = useState(false);

  const solvedRef = useRef(0);
  const penaltyRef = useRef(0);
  const wordStartRef = useRef(0);
  const finishedRef = useRef(false);
  const logRef = useRef<RoundLogEntry[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const gameStart = performance.now();
    wordStartRef.current = gameStart;

    const interval = setInterval(() => {
      const now = performance.now();
      const remaining = Math.max(
        0,
        DURATION_MS - (now - gameStart) - penaltyRef.current
      );
      setTimeLeftMs(remaining);
      setWordElapsedMs(now - wordStartRef.current);

      if (remaining <= 0 && !finishedRef.current) {
        finishedRef.current = true;
        clearInterval(interval);
        onFinish(scoreWordScramble(solvedRef.current), logRef.current);
      }
    }, 60);

    return () => clearInterval(interval);
  }, [onFinish]);

  const advanceWord = useCallback(() => {
    setCurrent(pickWord(usedRef.current));
    setGuess("");
    setShowHint(false);
    wordStartRef.current = performance.now();
    setWordElapsedMs(0);
    inputRef.current?.focus();
  }, []);

  function handleInputChange(val: string) {
    if (finishedRef.current) return;
    const clean = val.toLowerCase().replace(/[^a-z]/g, "");
    setGuess(clean);

    if (clean === current.word) {
      soundFx.correct();
      const elapsed = Math.round(performance.now() - wordStartRef.current);
      logRef.current.push({ ms: elapsed, correct: true });
      solvedRef.current += 1;
      setSolved(solvedRef.current);
      advanceWord();
    }
  }

  function handleSkip() {
    if (finishedRef.current) return;
    soundFx.wrong();
    penaltyRef.current += SKIP_PENALTY_MS;
    advanceWord();
  }

  const hintReady = wordElapsedMs >= HINT_UNLOCK_MS;

  return (
    <div className="mx-auto max-w-lg space-y-6 text-center">
      <div className="flex items-center justify-between">
        <span className="font-score text-lg font-bold text-[#0B1220]">
          Solved: <span className="text-[#FF4D8D]">{solved}</span>
        </span>
        <span className="font-score rounded-full bg-[#FFEEF4] px-4 py-1 text-lg font-bold text-[#CC2966]">
          {(timeLeftMs / 1000).toFixed(1)}s
        </span>
      </div>

      {/* Scrambled letter tiles */}
      <div className="flex flex-wrap items-center justify-center gap-2.5 rounded-3xl border border-white/12 bg-white/[0.04] px-4 py-8">
        {current.scrambled.split("").map((ch, idx) => (
          <span
            key={`${current.word}-${idx}`}
            className="font-heading flex h-13 w-12 items-center justify-center rounded-2xl border border-[#E8A849]/40 bg-[#0B101B] text-2xl font-extrabold uppercase text-[#F4F1EA] shadow-[0_4px_0_rgba(232,168,73,0.28)]"
          >
            {ch}
          </span>
        ))}
      </div>

      {showHint && (
        <p className="text-sm font-semibold text-[#FF4D8D]">
          Hint: Starts with <strong className="uppercase">{current.word[0]}</strong> and ends with{" "}
          <strong className="uppercase">{current.word[current.word.length - 1]}</strong>
        </p>
      )}

      <Input
        ref={inputRef}
        value={guess}
        onChange={(e) => handleInputChange(e.target.value)}
        placeholder={`Type the ${current.word.length}-letter word...`}
        aria-label="Unscrambled word"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className="font-mono h-14 text-center text-xl uppercase tracking-widest"
      />

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={!hintReady || showHint}
          onClick={() => setShowHint(true)}
        >
          <Lightbulb className="h-4 w-4 text-[#FFB020]" />
          {showHint
            ? "Hint shown"
            : hintReady
              ? "Show Hint"
              : `Hint in ${Math.ceil((HINT_UNLOCK_MS - wordElapsedMs) / 1000)}s`}
        </Button>

        <Button type="button" variant="outline" size="sm" onClick={handleSkip}>
          <SkipForward className="h-4 w-4" />
          Skip (−2s)
        </Button>
      </div>
    </div>
  );
}
