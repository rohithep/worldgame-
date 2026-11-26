"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Delete } from "lucide-react";
import { scoreMathDash } from "@/lib/scoring";
import { soundFx } from "@/lib/sound";
import { Button } from "@/components/ui/button";
import type { RoundLogEntry } from "@/lib/plausibility";
import type { GameRenderProps } from "./game-shell";

interface MathProblem {
  prompt: string;
  answer: number;
}

function generateProblem(level: number): MathProblem {
  const ops = level === 0 ? ["+", "-"] : ["+", "-", "×"];
  const op = ops[Math.floor(Math.random() * ops.length)];

  if (op === "+") {
    const max = 12 + level * 14;
    const a = Math.floor(Math.random() * max) + 2;
    const b = Math.floor(Math.random() * max) + 2;
    return { prompt: `${a} + ${b}`, answer: a + b };
  }
  if (op === "-") {
    const max = 15 + level * 14;
    const a = Math.floor(Math.random() * max) + 6;
    const b = Math.floor(Math.random() * (a - 1)) + 1;
    return { prompt: `${a} − ${b}`, answer: a - b };
  }
  const a = Math.floor(Math.random() * (6 + level * 3)) + 2;
  const b = Math.floor(Math.random() * (6 + level * 2)) + 2;
  return { prompt: `${a} × ${b}`, answer: a * b };
}

const DURATION_MS = 30_000;

export function MathDashGame({ onFinish }: GameRenderProps) {
  const [correctCount, setCorrectCount] = useState(0);
  const [problem, setProblem] = useState<MathProblem>(() => generateProblem(0));
  const [input, setInput] = useState("");
  const [timeLeftMs, setTimeLeftMs] = useState(DURATION_MS);
  const [flash, setFlash] = useState<"ok" | "bad" | null>(null);

  const finishedRef = useRef(false);
  const countRef = useRef(0);
  const problemStartRef = useRef<number>(0);
  const logRef = useRef<RoundLogEntry[]>([]);

  useEffect(() => {
    const startedAt = performance.now();
    problemStartRef.current = startedAt;
    const interval = setInterval(() => {
      const remaining = Math.max(0, DURATION_MS - (performance.now() - startedAt));
      setTimeLeftMs(remaining);
      if (remaining <= 0 && !finishedRef.current) {
        finishedRef.current = true;
        clearInterval(interval);
        onFinish(scoreMathDash(countRef.current), logRef.current);
      }
    }, 50);
    return () => clearInterval(interval);
  }, [onFinish]);

  const submitAnswer = useCallback(
    (valStr: string) => {
      if (finishedRef.current || !valStr) return;
      const num = Number(valStr);
      const elapsed = Math.round(performance.now() - problemStartRef.current);

      if (num === problem.answer) {
        soundFx.correct();
        countRef.current += 1;
        setCorrectCount(countRef.current);
        logRef.current.push({ ms: elapsed, correct: true });
        setFlash("ok");
        setInput("");
        const nextLevel = Math.floor(countRef.current / 5);
        setProblem(generateProblem(nextLevel));
        problemStartRef.current = performance.now();
      } else {
        soundFx.wrong();
        setFlash("bad");
        setInput("");
      }
      setTimeout(() => setFlash(null), 180);
    },
    [problem.answer]
  );

  const appendDigit = useCallback(
    (digit: string) => {
      if (finishedRef.current) return;
      const next = (input + digit).slice(0, 5);
      setInput(next);
      // Auto-submit as soon as the exact answer is typed for snappy arcade flow
      if (Number(next) === problem.answer && next.length === String(problem.answer).length) {
        submitAnswer(next);
      }
    },
    [input, problem.answer, submitAnswer]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") {
        e.preventDefault();
        appendDigit(e.key);
      } else if (e.key === "Backspace") {
        e.preventDefault();
        setInput((s) => s.slice(0, -1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        submitAnswer(input);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [appendDigit, submitAnswer, input]);

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="flex items-center justify-between">
        <div className="font-score text-lg font-bold text-[#0B1220]">
          Score: <span className="text-[#FFB020]">{correctCount}</span>
        </div>
        <div className="font-score rounded-full bg-[#FFF7E6] px-4 py-1 text-lg font-bold text-[#B37400]">
          {(timeLeftMs / 1000).toFixed(1)}s
        </div>
      </div>

      <div
        className={`rounded-3xl border p-6 text-center transition-colors ${
          flash === "ok"
            ? "border-[#19B37D] bg-[#E9F9F2]"
            : flash === "bad"
              ? "border-[#E5394D] bg-[#FFF0F3]"
              : "border-[#E6EAF2] bg-[#F7F9FC]"
        }`}
      >
        <p className="font-score text-4xl font-extrabold text-[#0B1220] sm:text-5xl">
          {problem.prompt} = ?
        </p>
        <div className="font-score mx-auto mt-4 flex h-14 max-w-[200px] items-center justify-center rounded-2xl border border-[#E8A849]/40 bg-[#0B101B] text-3xl font-bold text-[#F7D186]">
          {input || <span className="text-[#4A5568]">—</span>}
        </div>
      </div>

      {/* Large touch-friendly number pad */}
      <div className="grid grid-cols-3 gap-2.5">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <Button
            key={d}
            type="button"
            variant="secondary"
            className="font-score min-h-14 text-xl font-bold"
            onClick={() => appendDigit(d)}
          >
            {d}
          </Button>
        ))}
        <Button
          type="button"
          variant="outline"
          className="min-h-14"
          aria-label="Backspace"
          onClick={() => setInput((s) => s.slice(0, -1))}
        >
          <Delete className="h-5 w-5" />
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="font-score min-h-14 text-xl font-bold"
          onClick={() => appendDigit("0")}
        >
          0
        </Button>
        <Button
          type="button"
          className="min-h-14 text-base font-bold"
          onClick={() => submitAnswer(input)}
        >
          Enter
        </Button>
      </div>
    </div>
  );
}
