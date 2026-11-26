"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TYPING_WORDS } from "@/data/typing-words";
import { scoreTypingSprint } from "@/lib/scoring";
import { soundFx } from "@/lib/sound";
import { cn } from "@/lib/utils";
import type { GameRenderProps } from "./game-shell";

const DURATION_SEC = 30;
const DURATION_MS = DURATION_SEC * 1000;

function generateWordStream(count = 200): string[] {
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    out.push(TYPING_WORDS[Math.floor(Math.random() * TYPING_WORDS.length)]);
  }
  return out;
}

export function TypingSprintGame({ onFinish }: GameRenderProps) {
  const words = useMemo(() => generateWordStream(220), []);
  const [wordIdx, setWordIdx] = useState(0);
  const [typed, setTyped] = useState("");
  const [timeLeftMs, setTimeLeftMs] = useState(DURATION_MS);
  const [stats, setStats] = useState({ correctChars: 0, totalChars: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const finishedRef = useRef(false);
  const statsRef = useRef({ correctChars: 0, totalChars: 0 });

  useEffect(() => {
    inputRef.current?.focus();
    const startedAt = performance.now();

    const interval = setInterval(() => {
      const remaining = Math.max(0, DURATION_MS - (performance.now() - startedAt));
      setTimeLeftMs(remaining);
      if (remaining <= 0 && !finishedRef.current) {
        finishedRef.current = true;
        clearInterval(interval);
        const { netWpm, accuracy } = scoreTypingSprint(
          statsRef.current.correctChars,
          statsRef.current.totalChars,
          DURATION_SEC
        );
        onFinish(
          netWpm,
          [{ ms: DURATION_MS, correct: true }],
          <p className="font-score text-sm font-semibold text-[#9AA3B2]">
            Accuracy: <span className="text-[#F4F1EA]">{accuracy}%</span> • Correct chars:{" "}
            <span className="text-[#F4F1EA]">{statsRef.current.correctChars}</span>
          </p>
        );
      }
    }, 50);

    return () => clearInterval(interval);
  }, [onFinish]);

  const elapsedSec = Math.max(1, (DURATION_MS - timeLeftMs) / 1000);
  const live = scoreTypingSprint(stats.correctChars, stats.totalChars, elapsedSec);

  function commitWord(rawAttempt: string) {
    const attempt = rawAttempt.trim().toLowerCase();
    if (!attempt) {
      setTyped("");
      return;
    }
    const targetWord = words[wordIdx] || "";
    let matched = 0;
    for (let i = 0; i < Math.min(attempt.length, targetWord.length); i++) {
      if (attempt[i] === targetWord[i]) matched += 1;
    }
    const isExact = attempt === targetWord;
    if (isExact) {
      matched += 1;
      soundFx.click();
    }

    statsRef.current = {
      correctChars: statsRef.current.correctChars + matched,
      totalChars: statsRef.current.totalChars + attempt.length + 1,
    };
    setStats({ ...statsRef.current });
    setWordIdx((i) => i + 1);
    setTyped("");
  }

  function handleChange(val: string) {
    if (finishedRef.current) return;
    // Normalize lowercase so mobile auto-capitalization never penalizes valid words
    const normalized = val.toLowerCase();
    if (normalized.endsWith(" ")) {
      commitWord(normalized);
      return;
    }
    setTyped(normalized);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (!finishedRef.current) commitWord(typed);
    }
  }

  function keepVisibleAboveKeyboard() {
    // Scroll the compact typing container to the top of the viewport when mobile keyboard opens
    setTimeout(() => {
      containerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  }

  // Always keep the current word anchored at the start so it's 100% visible above a phone keyboard
  const upcomingWords = words.slice(wordIdx, wordIdx + 14);

  return (
    <div ref={containerRef} className="scroll-mt-16 space-y-3 sm:space-y-5">
      {/* Compact HUD row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 sm:gap-5">
          <div className="font-score text-xs font-bold text-[#9AA3B2] sm:text-sm">
            WPM <span className="text-base text-[#E8A849] sm:text-lg">{live.netWpm}</span>
          </div>
          <div className="font-score text-xs font-bold text-[#9AA3B2] sm:text-sm">
            ACC <span className="text-base text-[#F4F1EA] sm:text-lg">{live.accuracy}%</span>
          </div>
        </div>
        <div className="font-score rounded-full bg-[#7C5CFF]/20 px-3.5 py-1 text-base font-bold text-[#B8A5FF] sm:px-4 sm:text-lg">
          {(timeLeftMs / 1000).toFixed(1)}s
        </div>
      </div>

      {/* Tight, high-contrast word ribbon — fits cleanly above an open mobile keyboard */}
      <div
        onClick={() => inputRef.current?.focus()}
        className="cursor-text rounded-2xl border border-white/12 bg-[#0B101B] px-4 py-3.5 font-mono text-lg leading-relaxed sm:rounded-3xl sm:p-6 sm:text-2xl"
      >
        <div className="flex flex-wrap gap-x-2.5 gap-y-1.5 sm:gap-x-3 sm:gap-y-2">
          {upcomingWords.map((word, offset) => {
            const isCurrent = offset === 0;

            if (!isCurrent) {
              return (
                <span
                  key={`${wordIdx + offset}-${word}`}
                  className={cn(
                    "text-[#8E98AA]",
                    offset > 7 && "hidden sm:inline"
                  )}
                >
                  {word}
                </span>
              );
            }

            return (
              <span
                key={`${wordIdx}-${word}`}
                className="rounded-lg bg-[#E8A849]/20 px-2 py-0.5 font-bold text-[#F4F1EA] ring-1 ring-[#E8A849]/45"
              >
                {word.split("").map((ch, ci) => {
                  const typedCh = typed[ci];
                  const state =
                    typedCh === undefined
                      ? "pending"
                      : typedCh === ch
                        ? "ok"
                        : "bad";
                  return (
                    <span
                      key={ci}
                      className={cn(
                        state === "ok" && "text-[#48D6A4]",
                        state === "bad" && "bg-[#E5394D]/25 text-[#FF7A8A] underline"
                      )}
                    >
                      {ch}
                    </span>
                  );
                })}
              </span>
            );
          })}
        </div>
      </div>

      {/* Typing input right underneath the active word */}
      <input
        ref={inputRef}
        type="text"
        value={typed}
        onFocus={keepVisibleAboveKeyboard}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        enterKeyHint="next"
        autoCapitalize="none"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        aria-label="Type the highlighted word and press space"
        placeholder="Type highlighted word + Space..."
        style={{
          backgroundColor: "#0B101B",
          color: "#F4F1EA",
          WebkitTextFillColor: "#F4F1EA",
          caretColor: "#E8A849",
        }}
        className="font-mono min-h-12 w-full rounded-2xl border-2 border-[#E8A849]/55 bg-[#0B101B] px-4 text-base font-semibold text-[#F4F1EA] caret-[#E8A849] placeholder:text-[#6E7A8F] focus:border-[#E8A849] focus:outline-none sm:min-h-14 sm:px-5 sm:text-lg"
      />
    </div>
  );
}
