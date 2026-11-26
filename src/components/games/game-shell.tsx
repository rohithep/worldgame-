"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import {
  Check,
  Copy,
  ExternalLink,
  Play,
  RotateCcw,
  Share2,
  Trophy,
  Volume2,
  VolumeX,
} from "lucide-react";
import { GAME_BY_SLUG, SITE_NAME, type GameSlug } from "@/lib/constants";
import type { RoundLogEntry } from "@/lib/plausibility";
import { isSoundEnabled, setSoundEnabled, soundFx } from "@/lib/sound";
import { fetchSafe } from "@/lib/fetch-client";
import { formatScore } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CountryFlag } from "@/components/ui/flag";
import { GameAsset } from "@/components/game-asset";
import type { LeaderboardEntry } from "@/app/api/leaderboard/[slug]/route";

export type GamePhase = "idle" | "countdown" | "playing" | "result";

export interface SubmissionResult {
  score: number;
  isNewBest: boolean;
  bestScore: number | null;
  rank: number | null;
  totalPlayers: number | null;
  error?: string;
  sessionExpired?: boolean;
  canRetry?: boolean;
  extraSummary?: React.ReactNode;
}

export interface GameRenderProps {
  onFinish: (
    score: number,
    roundLog?: RoundLogEntry[],
    extraSummary?: React.ReactNode
  ) => void;
  soundOn: boolean;
}

interface GameShellProps {
  slug: GameSlug;
  player: {
    id: string;
    username: string;
    usernameDisplay: string;
    countryCode: string;
    countryName: string;
  } | null;
  initialPersonalBest: number | null;
  initialRank: number | null;
  GameComponent: React.ComponentType<GameRenderProps>;
}

export function GameShell({
  slug,
  player,
  initialPersonalBest,
  initialRank,
  GameComponent,
}: GameShellProps) {
  const game = GAME_BY_SLUG[slug];

  const [phase, setPhase] = useState<GamePhase>("idle");
  const [countdown, setCountdown] = useState(3);
  const [soundOn, setSoundOn] = useState(false);
  const [personalBest, setPersonalBest] = useState<number | null>(initialPersonalBest);
  const [personalRank, setPersonalRank] = useState<number | null>(initialRank);
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [slowNetwork, setSlowNetwork] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [top10, setTop10] = useState<LeaderboardEntry[]>([]);

  const sessionIdRef = useRef<string | null>(null);
  const lastSubmissionRef = useRef<{
    score: number;
    roundLog?: RoundLogEntry[];
    extraSummary?: React.ReactNode;
  } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setSoundOn(isSoundEnabled()), 0);
    return () => clearTimeout(t);
  }, []);

  const fetchTop10 = useCallback(() => {
    fetch(`/api/leaderboard/${slug}?limit=10`)
      .then((r) => r.json())
      .then((d: { entries?: LeaderboardEntry[] }) => {
        if (d.entries) setTop10(d.entries);
      })
      .catch(() => {});
  }, [slug]);

  useEffect(() => {
    fetchTop10();
  }, [fetchTop10]);

  function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    if (next) soundFx.click();
  }

  async function startGame() {
    if (!player) return;

    setResult(null);
    sessionIdRef.current = null;

    // Create server game session before countdown completes
    fetch("/api/games/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameSlug: slug }),
    })
      .then((r) => r.json())
      .then((d: { sessionId?: string }) => {
        if (d.sessionId) sessionIdRef.current = d.sessionId;
      })
      .catch(() => {});

    setPhase("countdown");
    setCountdown(3);
    soundFx.tick();
  }

  useEffect(() => {
    if (phase !== "countdown") return;
    const t = setTimeout(() => {
      if (countdown <= 1) {
        soundFx.go();
        setPhase("playing");
      } else {
        soundFx.tick();
        setCountdown((c) => c - 1);
      }
    }, 650);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  const submitScoreToServer = useCallback(
    async (
      score: number,
      roundLog?: RoundLogEntry[],
      extraSummary?: React.ReactNode
    ) => {
      const immediateResult: SubmissionResult = {
        score,
        isNewBest: false,
        bestScore: personalBest,
        rank: personalRank,
        totalPlayers: null,
        extraSummary,
      };

      setResult(immediateResult);
      setPhase("result");
      setSubmitting(true);
      setSlowNetwork(false);

      if (!player || !sessionIdRef.current) {
        setResult({
          ...immediateResult,
          error: !player
            ? "Sign in to save your score."
            : "Could not reach server to start your session. Check your connection.",
          canRetry: Boolean(player && sessionIdRef.current),
        });
        setSubmitting(false);
        return;
      }

      const res = await fetchSafe<{
        ok?: boolean;
        isNewBest?: boolean;
        bestScore?: number;
        rank?: number | null;
        totalPlayers?: number | null;
        error?: string;
      }>("/api/games/finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          gameSlug: slug,
          score,
          roundLog,
        }),
        onSlow: () => setSlowNetwork(true),
      });

      if (!res.ok || !res.data?.ok) {
        setResult({
          ...immediateResult,
          error: res.error || "Score could not be saved.",
          sessionExpired: res.sessionExpired,
          canRetry: res.offline || res.timedOut || res.status >= 500 || res.status === 0,
        });
      } else {
        const data = res.data;
        const isNewBest = Boolean(data.isNewBest);
        setPersonalBest(data.bestScore ?? personalBest);
        if (data.rank) setPersonalRank(data.rank);

        setResult({
          score,
          isNewBest,
          bestScore: data.bestScore ?? score,
          rank: data.rank ?? null,
          totalPlayers: data.totalPlayers ?? null,
          extraSummary,
        });

        if (isNewBest) {
          soundFx.win();
          const prefersReduced =
            typeof window !== "undefined" &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          if (!prefersReduced) {
            confetti({
              particleCount: 70,
              spread: 68,
              origin: { y: 0.65 },
              colors: [game.accent, "#E8A849", "#FFB020", "#19B37D"],
            });
          }
        }
        fetchTop10();
      }

      setSlowNetwork(false);
      setSubmitting(false);
    },
    [player, slug, personalBest, personalRank, game.accent, fetchTop10]
  );

  const handleFinish = useCallback(
    async (
      score: number,
      roundLog?: RoundLogEntry[],
      extraSummary?: React.ReactNode
    ) => {
      lastSubmissionRef.current = { score, roundLog, extraSummary };
      await submitScoreToServer(score, roundLog, extraSummary);
    },
    [submitScoreToServer]
  );

  const shareUrl =
    typeof window !== "undefined" && player
      ? `${window.location.origin}/share/${slug}/${player.username}`
      : "";

  async function handleShare() {
    if (!shareUrl || !result) return;
    const text = `I scored ${formatScore(slug, result.bestScore ?? result.score)} in ${game.name} on ${SITE_NAME}! Can you beat my rank?`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: `${game.name} — ${SITE_NAME}`, text, url: shareUrl });
        return;
      } catch {
        // User cancelled or unsupported; fall back to copy
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2500);
    } catch {
      // ignore
    }
  }

  const linkedInUrl = shareUrl
    ? `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`
    : "#";

  return (
    <div className="space-y-8">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <GameAsset
            src={game.assetPng}
            alt={game.name}
            accent={game.accent}
            gradient={game.gradient}
            isRotatingHue={game.isRotatingHue}
            className="h-12 w-12 shrink-0"
            iconSize="h-6 w-6"
          />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-heading text-2xl font-bold text-[#0B1220] sm:text-3xl">
                {game.name}
              </h1>
              {game.badge && (
                <span className="rounded-full bg-[#EEF2FA] px-3 py-0.5 text-xs font-semibold text-[#5B6475]">
                  {game.badge}
                </span>
              )}
            </div>
            <p className="text-sm text-[#5B6475]">{game.shortDesc}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={toggleSound}
            aria-label={soundOn ? "Mute sound effects" : "Enable sound effects"}
          >
            {soundOn ? (
              <>
                <Volume2 className="h-4 w-4 text-[#2F6BFF]" />
                <span className="hidden sm:inline">Sound On</span>
              </>
            ) : (
              <>
                <VolumeX className="h-4 w-4 text-[#8E98AB]" />
                <span className="hidden sm:inline">Sound Off</span>
              </>
            )}
          </Button>
          <Button asChild variant="secondary" size="sm">
            <Link href={`/leaderboard/${slug}`}>
              <Trophy className="h-4 w-4" />
              Full Board
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Play Card */}
      <div className="apple-glass relative overflow-hidden p-6 sm:p-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 left-1/2 h-56 w-96 -translate-x-1/2 rounded-full opacity-[0.14] blur-3xl"
          style={{ background: game.accent }}
        />

        {phase === "idle" && (
          <div className="mx-auto max-w-xl space-y-6 py-4 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center">
              <GameAsset
                src={game.assetPng}
                alt={game.name}
                accent={game.accent}
                gradient={game.gradient}
                isRotatingHue={game.isRotatingHue}
                className="h-20 w-20"
                iconSize="h-9 w-9"
              />
            </div>

            {personalBest !== null && (
              <div className="inline-flex items-center gap-3 rounded-full border border-[#E6EAF2] bg-[#F7F9FC] px-4 py-2 text-sm">
                <span className="text-[#5B6475]">Personal Best:</span>
                <span className="font-score font-bold text-[#0B1220]">
                  {formatScore(slug, personalBest)}
                </span>
                {personalRank && (
                  <span className="font-score rounded-full bg-[#2F6BFF]/10 px-2.5 py-0.5 text-xs font-bold text-[#2F6BFF]">
                    #{personalRank.toLocaleString("en-US")}
                  </span>
                )}
              </div>
            )}

            <ul className="space-y-2 rounded-2xl border border-[#E6EAF2] bg-[#F7F9FC]/80 p-5 text-left text-sm text-[#5B6475]">
              {game.rules.map((rule, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <span
                    className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: game.accent }}
                  />
                  <span>{rule}</span>
                </li>
              ))}
            </ul>

            {player ? (
              <Button type="button" size="lg" onClick={startGame} className="min-w-52">
                <Play className="h-5 w-5" />
                Play Now
              </Button>
            ) : (
              <div className="space-y-3 rounded-2xl border border-[#2F6BFF]/25 bg-[#EEF4FF] p-5">
                <p className="text-sm font-semibold text-[#0B1220]">
                  Join with a username and 6-digit PIN to play and rank worldwide.
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <Button asChild size="md">
                    <Link href="/join?mode=new">New Player</Link>
                  </Button>
                  <Button asChild variant="secondary" size="md">
                    <Link href="/join?mode=returning">Returning Player</Link>
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {phase === "countdown" && (
          <div
            aria-live="assertive"
            className="flex min-h-[300px] flex-col items-center justify-center py-12"
          >
            <p className="text-sm font-semibold uppercase tracking-widest text-[#5B6475]">
              Get Ready
            </p>
            <p
              className="font-score mt-3 text-7xl font-extrabold sm:text-8xl"
              style={{ color: game.accent }}
            >
              {countdown > 0 ? countdown : "GO!"}
            </p>
          </div>
        )}

        {phase === "playing" && (
          <div className="min-h-[320px]">
            <GameComponent onFinish={handleFinish} soundOn={soundOn} />
          </div>
        )}

        {phase === "result" && result && (
          <div
            aria-live="polite"
            className="mx-auto max-w-lg space-y-6 py-4 text-center"
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-[#E8A849]/35 bg-[#E8A849]/12 px-4 py-1.5 font-mono text-[11px] font-semibold tracking-wider text-[#F7D186] uppercase">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-[#E8A849]/30 border-t-[#E8A849]" />
                {slowNetwork
                  ? "Slow network — still saving your score..."
                  : "Saving score & calculating global rank..."}
              </span>
            ) : (
              result.isNewBest && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF7E6] px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-[#C27803] ring-1 ring-[#FFB020]/40">
                  <Trophy className="h-3.5 w-3.5" />
                  New Personal Best!
                </span>
              )
            )}

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#5B6475]">
                Your Score
              </p>
              <p
                data-testid="game-result-score"
                className="font-score mt-1 text-5xl font-extrabold text-[#0B1220]"
              >
                {formatScore(slug, result.score)}
              </p>
            </div>

            {result.extraSummary && <div>{result.extraSummary}</div>}

            {result.error && (
              <div
                role="alert"
                className="space-y-3 rounded-xl border border-[#FF4D6A]/35 bg-[#FFF0F3] px-4 py-3 text-sm font-medium text-[#FF7A8A]"
              >
                <p>{result.error}</p>
                {result.sessionExpired && (
                  <Button asChild size="sm" variant="primary">
                    <Link href="/join?mode=returning">Sign in again</Link>
                  </Button>
                )}
                {result.canRetry && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      const last = lastSubmissionRef.current;
                      if (last) {
                        submitScoreToServer(last.score, last.roundLog, last.extraSummary);
                      }
                    }}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Retry Saving Score
                  </Button>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-[#E6EAF2] bg-[#F7F9FC] p-4">
                <p className="text-xs font-semibold uppercase text-[#5B6475]">
                  Personal Best
                </p>
                <p className="font-score mt-1 text-xl font-bold text-[#0B1220]">
                  {submitting
                    ? "..."
                    : result.bestScore !== null
                      ? formatScore(slug, result.bestScore)
                      : formatScore(slug, result.score)}
                </p>
              </div>
              <div className="rounded-2xl border border-[#E6EAF2] bg-[#F7F9FC] p-4">
                <p className="text-xs font-semibold uppercase text-[#5B6475]">
                  Global Rank
                </p>
                <p className="font-score mt-1 text-xl font-bold text-[#2F6BFF]">
                  {submitting
                    ? "..."
                    : result.rank
                      ? `#${result.rank.toLocaleString("en-US")}`
                      : "—"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button type="button" size="lg" onClick={startGame}>
                <RotateCcw className="h-4 w-4" />
                Play Again
              </Button>
              {player && (
                <Button type="button" variant="secondary" size="lg" onClick={handleShare}>
                  {copiedShare ? (
                    <>
                      <Check className="h-4 w-4 text-[#19B37D]" />
                      Link Copied
                    </>
                  ) : (
                    <>
                      <Share2 className="h-4 w-4" />
                      Share Score
                    </>
                  )}
                </Button>
              )}
            </div>

            {player && (
              <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-medium text-[#5B6475]">
                <Link
                  href={`/share/${slug}/${player.username}`}
                  className="inline-flex items-center gap-1 hover:text-[#0B1220]"
                >
                  View share card
                  <ExternalLink className="h-3 w-3" />
                </Link>
                <span>•</span>
                <a
                  href={linkedInUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:text-[#0B1220]"
                >
                  Post on LinkedIn
                  <ExternalLink className="h-3 w-3" />
                </a>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => {
                    if (shareUrl) {
                      navigator.clipboard?.writeText(shareUrl).catch(() => {});
                      setCopiedShare(true);
                      setTimeout(() => setCopiedShare(false), 2000);
                    }
                  }}
                  className="inline-flex items-center gap-1 hover:text-[#0B1220]"
                >
                  <Copy className="h-3 w-3" />
                  Copy link
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Top 10 Preview */}
      <section className="arcade-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold text-[#0B1220]">
            Top 10 — {game.name}
          </h2>
          <Link
            href={`/leaderboard/${slug}`}
            className="text-sm font-semibold text-[#2F6BFF] hover:underline"
          >
            See all players →
          </Link>
        </div>

        {top10.length === 0 ? (
          <p className="py-6 text-center text-sm text-[#5B6475]">
            No ranked scores yet. Set the first record!
          </p>
        ) : (
          <div className="divide-y divide-[#E6EAF2]/80">
            {top10.map((entry) => (
              <div
                key={entry.userId}
                className="flex items-center justify-between gap-3 py-2.5 text-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-score w-8 font-bold text-[#5B6475]">
                    #{entry.rank}
                  </span>
                  <CountryFlag code={entry.countryCode} label={entry.countryName} />
                  <Link
                    href={`/share/${slug}/${entry.username}`}
                    className="truncate font-semibold text-[#0B1220] hover:text-[#2F6BFF]"
                  >
                    {entry.usernameDisplay}
                  </Link>
                </div>
                <span className="font-score shrink-0 font-bold text-[#0B1220]">
                  {formatScore(slug, entry.bestScore)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
