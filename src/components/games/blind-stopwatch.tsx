"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Hand } from "lucide-react";
import { scoreBlindStopwatch } from "@/lib/scoring";
import { soundFx } from "@/lib/sound";
import { Button } from "@/components/ui/button";
import type { GameRenderProps } from "./game-shell";

const TARGET_MS = 10_000;
const HIDE_AFTER_MS = 2_000;

export function BlindStopwatchGame({ onFinish }: GameRenderProps) {
  const startRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const stoppedRef = useRef(false);

  const [displayMs, setDisplayMs] = useState(0);
  const [hidden, setHidden] = useState(false);
  const [voided, setVoided] = useState(false);

  const stopTimer = useCallback(() => {
    if (stoppedRef.current || voided) return;
    stoppedRef.current = true;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);

    const elapsed = performance.now() - startRef.current;
    const missMs = scoreBlindStopwatch(elapsed);
    const diffSec = (elapsed - TARGET_MS) / 1000;
    const sign = diffSec >= 0 ? "+" : "-";
    soundFx.correct();

    onFinish(
      missMs,
      [{ ms: Math.round(elapsed), correct: true }],
      <div className="rounded-2xl border border-[#00B8D9]/30 bg-[#E6F9FC] p-4 text-sm">
        <p className="text-[#5B6475]">You stopped at</p>
        <p className="font-score mt-0.5 text-3xl font-extrabold text-[#0B1220]">
          {(elapsed / 1000).toFixed(3)} s
        </p>
        <p className="font-score mt-1 text-xs font-semibold text-[#0089A3]">
          {sign}
          {Math.abs(diffSec).toFixed(3)} s from 10.000 s
        </p>
      </div>
    );
  }, [onFinish, voided]);

  useEffect(() => {
    startRef.current = performance.now();

    const tick = () => {
      if (stoppedRef.current) return;
      const elapsed = performance.now() - startRef.current;
      if (elapsed >= HIDE_AFTER_MS) {
        setHidden(true);
      } else {
        setDisplayMs(elapsed);
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    const onVisibility = () => {
      if (document.hidden && !stoppedRef.current) {
        stoppedRef.current = true;
        if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
        setVoided(true);
        soundFx.wrong();
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        stopTimer();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [stopTimer]);

  if (voided) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFF0F3] text-[#E5394D]">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <h2 className="font-heading text-xl font-bold text-[#0B1220]">
          Attempt Invalidated
        </h2>
        <p className="max-w-sm text-sm text-[#5B6475]">
          You switched tabs or minimized the window while the blind stopwatch was running.
        </p>
        <Button
          type="button"
          onClick={() => {
            stoppedRef.current = false;
            setVoided(false);
            setHidden(false);
            setDisplayMs(0);
            startRef.current = performance.now();
          }}
        >
          Restart Clean Run
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center gap-8 py-6 text-center">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#5B6475]">
          Target: 10.000 seconds
        </p>
        <div className="mt-4 flex h-28 items-center justify-center">
          {hidden ? (
            <div className="rounded-3xl border border-dashed border-[#00B8D9]/50 bg-[#00B8D9]/12 px-8 py-5">
              <p className="font-heading text-2xl font-bold text-[#4CD9F0]">
                Timer Hidden
              </p>
              <p className="mt-1 text-xs text-[#9AA3B2]">
                Keep counting in your head...
              </p>
            </div>
          ) : (
            <p className="font-score text-6xl font-extrabold text-[#0B1220] sm:text-7xl">
              {(displayMs / 1000).toFixed(3)}
              <span className="ml-1 text-2xl text-[#5B6475]">s</span>
            </p>
          )}
        </div>
      </div>

      <Button
        type="button"
        size="lg"
        onClick={stopTimer}
        className="min-h-16 min-w-64 rounded-3xl text-lg"
        style={{
          background: "linear-gradient(180deg, #16C8E8 0%, #00B8D9 100%)",
          boxShadow: "0 5px 0 #0089A3, 0 14px 28px -8px rgba(0,184,217,0.45)",
        }}
      >
        <Hand className="h-5 w-5" />
        STOP AT 10.000s
      </Button>

      <p className="text-xs text-[#5B6475]">
        Tip: Tap the button or press <kbd className="rounded border border-[#D9E1EE] bg-white px-1.5 py-0.5 font-mono">Space</kbd>
      </p>
    </div>
  );
}
