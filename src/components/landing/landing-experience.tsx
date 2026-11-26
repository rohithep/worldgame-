"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, ChevronDown, Trophy } from "lucide-react";
import { GAMES, type GameSlug } from "@/lib/constants";
import { GameAsset } from "@/components/game-asset";
import { GlassCard } from "@/components/ui/glass-card";
import { CountryFlag } from "@/components/ui/flag";
import { WorldMap, type CountryCount } from "./world-map";
import { cn, formatScore } from "@/lib/utils";
import type { LeaderboardEntry } from "@/app/api/leaderboard/[slug]/route";

const ArcadeCanvas = dynamic(() => import("./arcade-canvas"), {
  ssr: false,
  loading: () => null,
});

interface LandingExperienceProps {
  stats: {
    totalPlayers: number;
    totalScores: number;
    totalPlays: number;
  };
  countryCounts: CountryCount[];
  isSignedIn: boolean;
}

function canUseWebGL(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext("webgl2") || canvas.getContext("webgl"))
    );
  } catch {
    return false;
  }
}

export function LandingExperience({
  stats,
  countryCounts,
  isSignedIn,
}: LandingExperienceProps) {
  const scrollRef = useRef(0);
  const mouseRef = useRef({ x: 0, y: 0 });
  const [showCanvas, setShowCanvas] = useState(false);

  const [selectedPodiumGame, setSelectedPodiumGame] =
    useState<GameSlug>("higher-or-lower");
  const [podiumEntries, setPodiumEntries] = useState<LeaderboardEntry[]>([]);

  // Boot the 3D golden spiral dot field on both phones and desktop after first paint
  useEffect(() => {
    if (!canUseWebGL()) return;
    const enable = () => setShowCanvas(true);
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(enable, { timeout: 700 });
      return () => window.cancelIdleCallback(id);
    }
    const t = setTimeout(enable, 250);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!showCanvas) return;

    const onScroll = () => {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      scrollRef.current = Math.min(1, Math.max(0, window.scrollY / max));
    };

    const onMouseMove = (e: MouseEvent) => {
      mouseRef.current = {
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: (e.clientY / window.innerHeight) * 2 - 1,
      };
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("mousemove", onMouseMove, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, [showCanvas]);

  useEffect(() => {
    let active = true;
    fetch(`/api/leaderboard/${selectedPodiumGame}?limit=3`)
      .then((r) => r.json())
      .then((data: { entries?: LeaderboardEntry[] }) => {
        if (active) setPodiumEntries(data.entries || []);
      })
      .catch(() => {
        if (active) setPodiumEntries([]);
      });
    return () => {
      active = false;
    };
  }, [selectedPodiumGame]);

  return (
    <div className="relative">
      {/* Ambient 3D Interstellar cosmic dust & golden spiral ring (phone + desktop) */}
      {showCanvas && <ArcadeCanvas scrollRef={scrollRef} mouseRef={mouseRef} />}

      <div className="relative z-10">
        {/* ================================================================
            ACT I — THE HORIZON (Mobile-first, zero-lag, seamless alpha dissolve)
            ================================================================ */}
        <section className="relative -mt-14 flex min-h-[86svh] items-center justify-center px-4 pt-20 pb-16 sm:-mt-16 sm:min-h-[100vh] sm:px-6 sm:pt-28 sm:pb-28">
          {/* Seamless alpha-masked orbital horizon — strictly non-interactive behind content */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 bottom-0 -z-10 overflow-hidden"
            style={{
              maskImage:
                "linear-gradient(to bottom, rgba(0,0,0,0.92) 0%, black 42%, rgba(0,0,0,0.45) 76%, transparent 100%)",
              WebkitMaskImage:
                "linear-gradient(to bottom, rgba(0,0,0,0.92) 0%, black 42%, rgba(0,0,0,0.45) 76%, transparent 100%)",
            }}
          >
            <Image
              src="/assets/cinema/hero-horizon.jpg"
              alt=""
              fill
              priority
              sizes="100vw"
              quality={72}
              className="object-cover object-center opacity-80"
            />
          </div>

          <div className="animate-cinema-up relative z-10 mx-auto flex w-full max-w-4xl flex-col items-center text-center">
            <h1 className="cinema-headline font-heading text-[34px] font-semibold leading-[1.1] tracking-[0.05em] uppercase sm:text-6xl lg:text-[74px]">
              Play. Score. Rank.
              <br />
              <span className="font-editorial cinema-amber-text text-[46px] font-medium tracking-[0.02em] normal-case sm:text-7xl lg:text-[90px]">
                Worldwide.
              </span>
            </h1>

            <div className="cinema-flare my-6 w-40 sm:my-8 sm:w-80" />

            <p className="mx-auto max-w-xl text-[15px] font-light leading-relaxed text-[#C8CFD9] sm:text-[18px]">
              Enter with a username and 6-digit PIN. No email, no noise — nine precision tests of timing, memory, and mind on one global board.
            </p>

            <div className="mt-8 flex w-full max-w-sm flex-col items-center justify-center gap-3 sm:mt-10 sm:max-w-none sm:flex-row sm:gap-4">
              {isSignedIn ? (
                <Link
                  href="/games"
                  className="arcade-btn arcade-btn-primary inline-flex min-h-12 w-full items-center justify-center gap-2.5 rounded-xl px-8 text-[12.5px] sm:min-h-13 sm:w-auto"
                >
                  Enter the Arena
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : (
                <>
                  <Link
                    href="/join?mode=new"
                    className="arcade-btn arcade-btn-primary inline-flex min-h-12 w-full items-center justify-center gap-2.5 rounded-xl px-8 text-[12.5px] sm:min-h-13 sm:w-auto"
                  >
                    New Player
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/join?mode=returning"
                    className="arcade-btn arcade-btn-secondary inline-flex min-h-12 w-full items-center justify-center rounded-xl px-8 text-[12.5px] sm:min-h-13 sm:w-auto"
                  >
                    Returning Player
                  </Link>
                </>
              )}
            </div>

            <Link
              href="/games"
              className="mt-6 inline-flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.18em] text-[#8E98AA] uppercase transition-colors hover:text-[#FFF0C4] sm:mt-7 sm:text-[11px] sm:tracking-[0.22em]"
            >
              Explore all 9 games without signing in
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div
            aria-hidden="true"
            className="absolute bottom-6 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-1.5 font-mono text-[10px] tracking-[0.36em] text-[#8E98AA]/75 uppercase sm:bottom-10 sm:flex"
          >
            <span>00:00:01 · Scroll</span>
            <ChevronDown className="h-3.5 w-3.5 animate-bounce text-[#E8A849]" />
          </div>
        </section>

        {/* ================================================================
            ACT II — THE NINE TRIALS
            ================================================================ */}
        <section className="relative z-10 mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-20">
          <div className="relative mb-8 overflow-hidden rounded-[20px] border border-white/[0.08] shadow-[0_24px_70px_-24px_rgba(0,0,0,0.95)] sm:mb-12 sm:rounded-[22px]">
            <div className="relative h-44 w-full sm:h-72">
              <Image
                src="/assets/cinema/monolith-arena.jpg"
                alt="Monumental obsidian and tungsten light hall"
                fill
                sizes="(max-width: 768px) 100vw, 1152px"
                quality={70}
                className="object-cover object-center opacity-75"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#04060A]/95 via-[#04060A]/60 to-[#04060A]/30" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#04060A] via-transparent to-[#04060A]/45" />
            </div>

            <div className="absolute inset-0 flex flex-col justify-end p-5 sm:p-11">
              <p className="cinema-kicker text-[#E8A849]">Act II · The Collection</p>
              <div className="mt-2 flex flex-col justify-between gap-2 sm:flex-row sm:items-end sm:gap-4">
                <h2 className="cinema-headline font-heading text-xl font-semibold tracking-[0.06em] uppercase sm:text-4xl">
                  Nine Games. Nine{" "}
                  <span className="font-editorial cinema-amber-text text-2xl tracking-normal normal-case sm:text-5xl">
                    Boards.
                  </span>
                </h2>
                <Link
                  href="/games"
                  className="inline-flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.2em] text-[#F7D186] uppercase hover:underline sm:text-[11px]"
                >
                  Open full arena
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {GAMES.map((game) => (
              <GlassCard
                key={game.slug}
                glowColor={game.accent}
                className="p-5 sm:p-7"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <GameAsset
                      src={game.assetPng}
                      alt={game.name}
                      accent={game.accent}
                      gradient={game.gradient}
                      isRotatingHue={game.isRotatingHue}
                      className="h-12 w-12 shrink-0 sm:h-13 sm:w-13"
                    />
                    <span className="rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1 font-mono text-[10px] tracking-[0.14em] text-[#8E98AA] uppercase">
                      {game.badge ||
                        (game.scoreDirection === "lower"
                          ? "Lowest wins"
                          : game.unitLabel)}
                    </span>
                  </div>

                  <h3 className="mt-4 text-[18px] font-semibold tracking-[-0.015em] text-[#F4F1EA] sm:mt-6 sm:text-[20px]">
                    {game.name}
                  </h3>
                  <p className="mt-1.5 text-[13.5px] font-light leading-relaxed text-[#8E98AA] sm:mt-2 sm:text-[14px]">
                    {game.shortDesc}
                  </p>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-white/[0.07] pt-3.5 sm:mt-7 sm:pt-4">
                  <Link
                    href={`/games/${game.slug}`}
                    className="inline-flex min-h-10 items-center gap-1.5 font-mono text-[11px] font-semibold tracking-[0.16em] text-[#E8A849] uppercase transition-colors hover:text-[#FFF0C4]"
                  >
                    Play trial
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                  <Link
                    href={`/leaderboard/${game.slug}`}
                    aria-label={`${game.name} global leaderboard`}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2.5 font-mono text-[11px] tracking-[0.14em] text-[#8E98AA] uppercase transition-colors hover:bg-white/[0.06] hover:text-[#F4F1EA]"
                  >
                    <Trophy className="h-3.5 w-3.5" />
                    Board
                  </Link>
                </div>
              </GlassCard>
            ))}
          </div>
        </section>

        <div className="cinema-flare mx-auto max-w-4xl opacity-50" />

        {/* ================================================================
            ACT III — PLANETARY TELEMETRY & WORLD MAP
            ================================================================ */}
        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-24">
          <div className="apple-glass overflow-hidden p-5 sm:p-12">
            <div className="mx-auto max-w-2xl text-center">
              <p className="cinema-kicker text-[#68B0E8]">
                Act III · Planetary Telemetry
              </p>
              <h2 className="cinema-headline mt-2.5 font-heading text-2xl font-semibold tracking-[0.06em] uppercase sm:mt-3 sm:text-4xl">
                Every Player{" "}
                <span className="font-editorial cinema-amber-text text-3xl tracking-normal normal-case sm:text-5xl">
                  Counts.
                </span>
              </h2>
              <p className="mt-2.5 text-[14px] font-light leading-relaxed text-[#8E98AA] sm:mt-3 sm:text-[15px]">
                No Top-100 cutoff. Whether you stand at #1 or #42,819, your exact coordinate on the global board is permanent and live.
              </p>
            </div>

            <div className="my-7 grid grid-cols-3 divide-x divide-white/[0.07] rounded-2xl border border-white/10 bg-white/[0.02] sm:my-10">
              <div className="p-4 text-center sm:p-7">
                <p className="font-mono text-[9px] tracking-[0.18em] text-[#8E98AA] uppercase sm:text-[10.5px] sm:tracking-[0.3em]">
                  Players
                </p>
                <p className="font-score mt-1.5 text-2xl font-semibold text-[#F4F1EA] sm:mt-2.5 sm:text-5xl">
                  {stats.totalPlayers.toLocaleString("en-US")}
                </p>
              </div>
              <div className="p-4 text-center sm:p-7">
                <p className="font-mono text-[9px] tracking-[0.18em] text-[#8E98AA] uppercase sm:text-[10.5px] sm:tracking-[0.3em]">
                  Scores
                </p>
                <p className="font-score mt-1.5 text-2xl font-semibold text-[#E8A849] sm:mt-2.5 sm:text-5xl">
                  {stats.totalScores.toLocaleString("en-US")}
                </p>
              </div>
              <div className="p-4 text-center sm:p-7">
                <p className="font-mono text-[9px] tracking-[0.18em] text-[#8E98AA] uppercase sm:text-[10.5px] sm:tracking-[0.3em]">
                  Rounds
                </p>
                <p className="font-score mt-1.5 text-2xl font-semibold text-[#68B0E8] sm:mt-2.5 sm:text-5xl">
                  {stats.totalPlays.toLocaleString("en-US")}
                </p>
              </div>
            </div>

            <WorldMap countryCounts={countryCounts} />
          </div>
        </section>

        {/* ================================================================
            ACT IV — THE STANDINGS
            ================================================================ */}
        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-24">
          <div className="apple-glass p-5 sm:p-12">
            <div className="text-center">
              <p className="cinema-kicker text-[#E8A849]">Act IV · Live Standings</p>
              <h2 className="cinema-headline mt-2.5 font-heading text-2xl font-semibold tracking-[0.06em] uppercase sm:mt-3 sm:text-4xl">
                Top of the{" "}
                <span className="font-editorial cinema-amber-text text-3xl tracking-normal normal-case sm:text-5xl">
                  World.
                </span>
              </h2>
            </div>

            <div className="mt-6 flex justify-start overflow-x-auto pb-1 sm:mt-8 sm:justify-center">
              <div className="apple-segmented inline-flex gap-1">
                {GAMES.map((g) => {
                  const active = selectedPodiumGame === g.slug;
                  return (
                    <button
                      key={g.slug}
                      type="button"
                      onClick={() => setSelectedPodiumGame(g.slug)}
                      className={cn(
                        "relative min-h-9 shrink-0 rounded-lg px-3 font-mono text-[10.5px] tracking-[0.1em] uppercase transition-colors sm:px-3.5 sm:text-[11px]",
                        active
                          ? "bg-gradient-to-b from-[#F3C46E] to-[#D99432] font-semibold text-[#07090E]"
                          : "text-[#8E98AA] hover:text-[#F4F1EA]"
                      )}
                    >
                      {g.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              key={selectedPodiumGame}
              className="mt-7 grid grid-cols-1 items-end gap-4 sm:mt-10 sm:grid-cols-3 sm:gap-5"
            >
              {[1, 0, 2].map((idx) => {
                const entry = podiumEntries[idx];
                const place = idx + 1;
                const heightClass =
                  place === 1
                    ? "sm:min-h-[270px]"
                    : place === 2
                      ? "sm:min-h-[225px]"
                      : "sm:min-h-[195px]";
                const trophy =
                  place === 1
                    ? "/assets/png/trophy-gold.png"
                    : place === 2
                      ? "/assets/png/trophy-silver.png"
                      : "/assets/png/trophy-bronze.png";
                const accent =
                  place === 1 ? "#E8A849" : place === 2 ? "#94A3B8" : "#C87D55";

                return (
                  <div
                    key={`${selectedPodiumGame}-${place}`}
                    className={cn(
                      "flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.015] p-6 text-center sm:p-7",
                      heightClass,
                      place === 1 &&
                        "border-[#E8A849]/45 shadow-[0_20px_50px_-20px_rgba(232,168,73,0.28)]"
                    )}
                  >
                    <GameAsset
                      src={trophy}
                      alt={`Rank ${place}`}
                      accent={accent}
                      className="mb-3 h-11 w-11 sm:h-12 sm:w-12"
                      iconSize="h-5 w-5"
                    />
                    <span className="font-mono text-[10px] font-semibold tracking-[0.26em] text-[#8E98AA] uppercase">
                      Rank 0{place}
                    </span>
                    {entry ? (
                      <>
                        <p className="mt-1.5 text-lg font-semibold text-[#F4F1EA] sm:text-xl">
                          {entry.usernameDisplay}
                        </p>
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-[#8E98AA]">
                          <CountryFlag
                            code={entry.countryCode}
                            label={entry.countryName}
                          />
                          <span>{entry.countryName}</span>
                        </div>
                        <p className="font-score mt-3 text-xl font-semibold text-[#E8A849] sm:mt-4 sm:text-2xl">
                          {formatScore(selectedPodiumGame, entry.bestScore)}
                        </p>
                      </>
                    ) : (
                      <p className="mt-2 text-sm text-[#6B7689]">Unclaimed</p>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-7 text-center sm:mt-8">
              <Link
                href={`/leaderboard/${selectedPodiumGame}`}
                className="inline-flex items-center gap-1.5 font-mono text-[11px] font-medium tracking-[0.18em] text-[#E8A849] uppercase hover:text-[#FFF0C4] hover:underline"
              >
                Explore full global board
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </section>

        {/* ================================================================
            ACT V — THE PROTOCOL
            ================================================================ */}
        <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-24">
          <div className="mb-9 text-center sm:mb-14">
            <p className="cinema-kicker text-[#68B0E8]">Act V · The Protocol</p>
            <h2 className="cinema-headline mt-2.5 font-heading text-2xl font-semibold tracking-[0.06em] uppercase sm:mt-3 sm:text-4xl">
              Zero Friction. Pure{" "}
              <span className="font-editorial cinema-amber-text text-3xl tracking-normal normal-case sm:text-5xl">
                Play.
              </span>
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
            {[
              {
                num: "01",
                title: "Claim your identity",
                desc: "Choose a unique handle, your country, and a 6-digit PIN. Save your pass card — no email or phone required.",
                glow: "#E8A849",
              },
              {
                num: "02",
                title: "Enter any trial",
                desc: "Nine focused skill games engineered for phones and desktop with razor-sharp timing and instant restarts.",
                glow: "#68B0E8",
              },
              {
                num: "03",
                title: "Ascend the board",
                desc: "Every submission is server-verified for plausibility. Beat your record and broadcast your live rank card.",
                glow: "#19B37D",
              },
            ].map((step) => (
              <GlassCard key={step.num} glowColor={step.glow} className="p-6 sm:p-8">
                <span className="cinema-kicker text-[#E8A849]">
                  Phase {step.num}
                </span>
                <div className="mt-5 sm:mt-8">
                  <h3 className="text-lg font-semibold text-[#F4F1EA] sm:text-xl">
                    {step.title}
                  </h3>
                  <p className="mt-2.5 text-[14px] font-light leading-relaxed text-[#8E98AA] sm:mt-3 sm:text-[14.5px]">
                    {step.desc}
                  </p>
                </div>
              </GlassCard>
            ))}
          </div>
        </section>

        {/* ================================================================
            ACT VI — THE FINALE
            ================================================================ */}
        <section className="mx-auto max-w-5xl px-4 py-14 text-center sm:px-6 sm:py-24">
          <div className="relative overflow-hidden rounded-[22px] border border-white/10 px-6 py-14 shadow-[0_28px_80px_-24px_rgba(0,0,0,0.95)] sm:rounded-[24px] sm:px-14 sm:py-24">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0">
              <Image
                src="/assets/cinema/hero-horizon.jpg"
                alt=""
                fill
                sizes="(max-width: 768px) 100vw, 1024px"
                quality={68}
                className="scale-105 object-cover object-bottom opacity-45"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#04060A]/95 via-[#04060A]/65 to-[#04060A]/85" />
            </div>

            <div className="relative z-10">
              <p className="cinema-kicker text-[#E8A849]">Finale · Enter Now</p>
              <h2 className="cinema-headline mt-3 font-heading text-2xl font-semibold tracking-[0.06em] uppercase sm:mt-4 sm:text-5xl">
                Your Spot Is{" "}
                <span className="font-editorial cinema-amber-text text-3xl tracking-normal normal-case sm:text-6xl">
                  Waiting.
                </span>
              </h2>
              <p className="mx-auto mt-3 max-w-md text-[14.5px] font-light leading-relaxed text-[#C8CFD9] sm:mt-4 sm:text-[15.5px]">
                Pick your handle, lock in your 6-digit PIN, and claim your permanent rank on Earth.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:mt-10 sm:flex-row sm:gap-4">
                <Link
                  href="/join?mode=new"
                  className="arcade-btn arcade-btn-primary inline-flex min-h-12 w-full items-center justify-center gap-2.5 rounded-xl px-8 text-[12.5px] sm:min-h-13 sm:w-auto"
                >
                  New Player
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/join?mode=returning"
                  className="arcade-btn arcade-btn-secondary inline-flex min-h-12 w-full items-center justify-center rounded-xl px-8 text-[12.5px] sm:min-h-13 sm:w-auto"
                >
                  Returning Player
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
