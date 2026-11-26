"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useVirtualizer } from "@tanstack/react-virtual";
import { motion } from "framer-motion";
import {
  Flag as FlagIcon,
  Loader2,
  Play,
  Search,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";
import { GAMES, GAME_BY_SLUG, type GameSlug } from "@/lib/constants";
import { CountryFlag } from "@/components/ui/flag";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GameAsset } from "@/components/game-asset";
import { fetchCachedJson, fetchSafe } from "@/lib/fetch-client";
import { cn, formatDateShort, formatScore } from "@/lib/utils";
import type { LeaderboardEntry } from "@/app/api/leaderboard/[slug]/route";

interface MyRankData {
  signedIn: boolean;
  username?: string;
  usernameDisplay?: string;
  countryCode?: string;
  countryName?: string;
  rank: number | null;
  totalPlayers?: number;
  bestScore?: number;
  plays?: number;
}

interface NextCursor {
  cursorScore: number;
  cursorAchievedAt: string;
  cursorUserId: string;
  startRank: number;
}

interface CountryOption {
  code: string;
  name: string;
}

export function LeaderboardBoard({
  slug,
  isSignedIn,
}: {
  slug: GameSlug;
  isSignedIn: boolean;
}) {
  const game = GAME_BY_SLUG[slug];
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [nextCursor, setNextCursor] = useState<NextCursor | null>(null);
  const [totalPlayers, setTotalPlayers] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [slowNetwork, setSlowNetwork] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [countryFilter, setCountryFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [countries, setCountries] = useState<CountryOption[]>([]);

  const [myRank, setMyRank] = useState<MyRankData | null>(null);
  const [reportingEntry, setReportingEntry] = useState<LeaderboardEntry | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [reportStatus, setReportStatus] = useState<string | null>(null);

  const parentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCachedJson<CountryOption[]>("/data/geo/countries.json").then((res) => {
      if (res.ok && res.data) setCountries(res.data);
    });
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const fetchPage = useCallback(
    async (cursor: NextCursor | null, append: boolean) => {
      if (append) setLoadingMore(true);
      else {
        setLoading(true);
        setLoadError(null);
      }
      setSlowNetwork(false);

      const params = new URLSearchParams({ limit: "50" });
      if (countryFilter) params.set("country", countryFilter);
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (cursor) {
        params.set("cursorScore", String(cursor.cursorScore));
        params.set("cursorAchievedAt", cursor.cursorAchievedAt);
        params.set("cursorUserId", cursor.cursorUserId);
        params.set("startRank", String(cursor.startRank));
      }

      const res = await fetchSafe<{
        entries: LeaderboardEntry[];
        nextCursor: NextCursor | null;
        totalPlayers: number;
      }>(`/api/leaderboard/${slug}?${params.toString()}`, {
        onSlow: () => setSlowNetwork(true),
      });

      if (!res.ok || !res.data) {
        if (!append) {
          setEntries([]);
          setLoadError(res.error || "Could not load leaderboard.");
        }
      } else {
        setEntries((prev) =>
          append ? [...prev, ...(res.data!.entries || [])] : res.data!.entries || []
        );
        setNextCursor(res.data.nextCursor ?? null);
        setTotalPlayers(res.data.totalPlayers ?? 0);
      }

      setSlowNetwork(false);
      setLoading(false);
      setLoadingMore(false);
    },
    [slug, countryFilter, debouncedSearch]
  );

  // Initial load and filter changes
  useEffect(() => {
    fetchPage(null, false);
  }, [fetchPage]);

  // Lightweight 30s refresh when viewing top of unfiltered board
  useEffect(() => {
    if (debouncedSearch) return;
    const interval = setInterval(() => {
      if (document.visibilityState === "visible" && entries.length <= 50) {
        fetchPage(null, false);
      }
    }, 30_000);
    return () => clearInterval(interval);
  }, [debouncedSearch, entries.length, fetchPage]);

  // Fetch "my rank"
  useEffect(() => {
    const params = new URLSearchParams();
    if (countryFilter) params.set("country", countryFilter);
    fetch(`/api/leaderboard/${slug}/me?${params.toString()}`)
      .then((r) => r.json())
      .then((data: MyRankData) => setMyRank(data))
      .catch(() => {});
  }, [slug, countryFilter]);

  const rowVirtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 62,
    overscan: 10,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();

  // Trigger infinite scroll load when reaching bottom of virtualized list
  useEffect(() => {
    const last = virtualItems[virtualItems.length - 1];
    if (!last) return;
    if (last.index >= entries.length - 8 && nextCursor && !loadingMore) {
      fetchPage(nextCursor, true);
    }
  }, [virtualItems, entries.length, nextCursor, loadingMore, fetchPage]);

  const top3 = useMemo(() => {
    if (debouncedSearch) return [];
    return entries.slice(0, 3);
  }, [entries, debouncedSearch]);

  function handleJumpToMe() {
    if (!myRank?.username) return;
    const idx = entries.findIndex((e) => e.username === myRank.username);
    if (idx >= 0) {
      rowVirtualizer.scrollToIndex(idx, { align: "center" });
    } else {
      setSearchQuery(myRank.usernameDisplay || myRank.username);
    }
  }

  async function submitReport(e: React.FormEvent) {
    e.preventDefault();
    if (!reportingEntry || !reportReason.trim()) return;
    setReportStatus("submitting");
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportedUserId: reportingEntry.userId,
          gameSlug: slug,
          reason: reportReason.trim(),
        }),
      });
      if (res.ok) {
        setReportStatus("sent");
        setTimeout(() => {
          setReportingEntry(null);
          setReportReason("");
          setReportStatus(null);
        }, 1200);
      } else {
        setReportStatus("error");
      }
    } catch {
      setReportStatus("error");
    }
  }

  return (
    <div className="space-y-8">
      {/* Game selector strip — Apple Segmented Control */}
      <div className="flex overflow-x-auto pb-1" role="navigation" aria-label="Choose leaderboard game">
        <div className="apple-segmented inline-flex gap-1">
          {GAMES.map((g) => {
            const active = g.slug === slug;
            return (
              <Link
                key={g.slug}
                href={`/leaderboard/${g.slug}`}
                className={cn(
                  "inline-flex min-h-9 shrink-0 items-center rounded-full px-4 text-[13px] font-medium transition-all",
                  active
                    ? "bg-gradient-to-b from-[#F4C36B] to-[#DE9B38] text-[#090C12] shadow-[0_4px_16px_rgba(232,168,73,0.4)]"
                    : "text-[#9AA3B2] hover:text-[#F4F1EA]"
                )}
              >
                <span>{g.name}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Header card */}
      <div className="arcade-card flex flex-col justify-between gap-5 p-6 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <GameAsset
            src={game.assetPng}
            alt={game.name}
            accent={game.accent}
            gradient={game.gradient}
            isRotatingHue={game.isRotatingHue}
            className="h-14 w-14 shrink-0"
          />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-heading text-2xl font-bold text-[#0B1220] sm:text-3xl">
                {game.name} Leaderboard
              </h1>
              <span className="rounded-full bg-[#EEF2FA] px-3 py-0.5 text-xs font-semibold text-[#5B6475]">
                {game.scoreDirection === "lower" ? "Lowest wins" : "Highest wins"}
              </span>
            </div>
            <p className="mt-1 text-sm text-[#5B6475]">
              {totalPlayers.toLocaleString("en-US")} ranked player
              {totalPlayers === 1 ? "" : "s"} — every player listed, no cap.
            </p>
          </div>
        </div>

        <Button asChild size="md">
          <Link href={`/games/${slug}`}>
            <Play className="h-4 w-4" />
            Play {game.name}
          </Link>
        </Button>
      </div>

      {/* Animated Top 3 Podium */}
      {top3.length > 0 && (
        <section aria-label="Top 3 players" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[top3[1], top3[0], top3[2]].map((entry, visualIdx) => {
            if (!entry) return <div key={visualIdx} className="hidden sm:block" />;
            const place = entry.rank;
            const trophyFile =
              place === 1
                ? "/assets/png/trophy-gold.png"
                : place === 2
                  ? "/assets/png/trophy-silver.png"
                  : "/assets/png/trophy-bronze.png";
            const accent =
              place === 1 ? "#FFB020" : place === 2 ? "#94A3B8" : "#D97746";

            return (
              <motion.div
                key={entry.userId}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: visualIdx * 0.08, duration: 0.35 }}
                className={cn(
                  "arcade-card relative flex flex-col items-center p-6 text-center",
                  place === 1 && "border-[#FFB020]/50 sm:-translate-y-2 shadow-[0_20px_44px_-16px_rgba(255,176,32,0.28)]"
                )}
              >
                <span
                  className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: accent }}
                >
                  #{place}
                </span>
                <GameAsset
                  src={trophyFile}
                  alt={`Rank ${place} trophy`}
                  accent={accent}
                  className="mb-3 h-14 w-14"
                  iconSize="h-6 w-6"
                />
                <Link
                  href={`/share/${slug}/${entry.username}`}
                  className="font-heading text-lg font-bold text-[#0B1220] hover:text-[#2F6BFF]"
                >
                  {entry.usernameDisplay}
                </Link>
                <div className="mt-1 flex items-center gap-1.5 text-xs text-[#5B6475]">
                  <CountryFlag code={entry.countryCode} label={entry.countryName} />
                  <span>{entry.countryName}</span>
                </div>
                <p
                  className="font-score mt-3 text-xl font-bold"
                  style={{ color: game.accent }}
                >
                  {formatScore(slug, entry.bestScore)}
                </p>
              </motion.div>
            );
          })}
        </section>
      )}

      {/* Pinned "Jump to my rank" bar */}
      {myRank?.signedIn && (
        <div className="arcade-card flex flex-wrap items-center justify-between gap-3 border-[#E8A849]/35 bg-gradient-to-r from-[#E8A849]/12 to-transparent px-5 py-3.5">
          {myRank.rank ? (
            <>
              <div className="flex items-center gap-3">
                <span className="font-score rounded-xl bg-[#E8A849] px-3 py-1 text-sm font-bold text-[#07090E]">
                  #{myRank.rank.toLocaleString("en-US")}
                </span>
                <div>
                  <p className="text-sm font-bold text-[#F4F1EA]">
                    {myRank.usernameDisplay}{" "}
                    <span className="font-normal text-[#8E98AA]">
                      (of {myRank.totalPlayers?.toLocaleString("en-US")})
                    </span>
                  </p>
                  <p className="font-score text-xs font-semibold text-[#E8A849]">
                    Your best: {formatScore(slug, myRank.bestScore ?? 0)}
                  </p>
                </div>
              </div>
              <Button type="button" variant="secondary" size="sm" onClick={handleJumpToMe}>
                <Sparkles className="h-3.5 w-3.5 text-[#E8A849]" />
                Jump to my rank
              </Button>
            </>
          ) : (
            <div className="flex w-full flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-[#8E98AA]">
                You haven&apos;t posted a score on <strong>{game.name}</strong> yet.
              </p>
              <Button asChild size="sm">
                <Link href={`/games/${slug}`}>Play to get ranked</Link>
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Filters: Search + Country */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8E98AB]"
            aria-hidden="true"
          />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by username..."
            aria-label="Search leaderboard by username"
            className="pl-10 pr-9"
          />
          {searchQuery && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-[#5B6475] hover:bg-[#EEF2FA]"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <select
          aria-label="Filter leaderboard by country"
          value={countryFilter}
          onChange={(e) => setCountryFilter(e.target.value)}
          className="min-h-12 rounded-2xl border border-white/15 bg-[#0B101B] px-4 text-sm font-medium text-[#F4F1EA] focus:border-[#E8A849] focus:outline-none sm:w-64"
        >
          <option value="">All Countries (World)</option>
          {countries.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Virtualized Table */}
      <div className="arcade-card overflow-hidden p-0">
        <div className="grid grid-cols-[64px_1fr_auto] items-center gap-3 border-b border-[#E6EAF2] bg-[#F7F9FC] px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#5B6475] sm:grid-cols-[72px_1.4fr_1fr_140px_110px_44px] sm:px-6">
          <span>Rank</span>
          <span>Player</span>
          <span className="hidden sm:block">Country</span>
          <span className="text-right">Score</span>
          <span className="hidden text-right sm:block">Date</span>
          <span className="hidden sm:block" />
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-sm text-[#9AA3B2]">
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-[#E8A849]" />
              <span>Loading global board...</span>
            </div>
            {slowNetwork && (
              <p className="text-xs text-[#E8A849]">
                Taking longer than usual (slow network)...
              </p>
            )}
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <p className="font-heading text-lg font-bold text-[#F4F1EA]">
              Could not load leaderboard
            </p>
            <p className="max-w-sm text-sm text-[#FF7A8A]">{loadError}</p>
            <Button
              type="button"
              size="sm"
              className="mt-1"
              onClick={() => fetchPage(null, false)}
            >
              Retry
            </Button>
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <Trophy className="h-10 w-10 text-[#6B7689]" aria-hidden="true" />
            <p className="font-heading text-lg font-bold text-[#F4F1EA]">
              {debouncedSearch || countryFilter ? "No matching results" : "No scores yet"}
            </p>
            <p className="max-w-sm text-sm text-[#9AA3B2]">
              {debouncedSearch || countryFilter
                ? "No players matched your current search or country filter."
                : "Be the very first player to claim #1 on this board!"}
            </p>
            {debouncedSearch || countryFilter ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="mt-2"
                onClick={() => {
                  setSearchQuery("");
                  setCountryFilter("");
                }}
              >
                Reset filters
              </Button>
            ) : (
              <Button asChild size="sm" className="mt-2">
                <Link href={`/games/${slug}`}>Play {game.name}</Link>
              </Button>
            )}
          </div>
        ) : (
          <div
            ref={parentRef}
            className="h-[540px] overflow-auto"
            role="region"
            aria-label={`${game.name} global leaderboard entries`}
          >
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: "100%",
                position: "relative",
              }}
            >
              {virtualItems.map((virtualRow) => {
                const entry = entries[virtualRow.index];
                if (!entry) return null;
                const isMe = myRank?.username === entry.username;

                return (
                  <div
                    key={entry.userId}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                    className={cn(
                      "grid grid-cols-[64px_1fr_auto] items-center gap-3 border-b border-[#E6EAF2]/70 px-4 text-sm transition-colors hover:bg-[#F7F9FC] sm:grid-cols-[72px_1.4fr_1fr_140px_110px_44px] sm:px-6",
                      isMe && "bg-[#EEF4FF]/80"
                    )}
                  >
                    <span className="font-score font-bold text-[#0B1220]">
                      #{entry.rank.toLocaleString("en-US")}
                    </span>

                    <div className="min-w-0">
                      <Link
                        href={`/share/${slug}/${entry.username}`}
                        className="block truncate font-semibold text-[#0B1220] hover:text-[#2F6BFF]"
                      >
                        {entry.usernameDisplay}
                      </Link>
                      <div className="flex items-center gap-1.5 text-xs text-[#5B6475] sm:hidden">
                        <CountryFlag
                          code={entry.countryCode}
                          label={entry.countryName}
                          className="h-3 w-4.5"
                        />
                        <span className="truncate">{entry.countryName}</span>
                      </div>
                    </div>

                    <div className="hidden items-center gap-2 truncate text-[#5B6475] sm:flex">
                      <CountryFlag code={entry.countryCode} label={entry.countryName} />
                      <span className="truncate">{entry.countryName}</span>
                    </div>

                    <span className="font-score text-right font-bold text-[#0B1220]">
                      {formatScore(slug, entry.bestScore)}
                    </span>

                    <span className="hidden text-right text-xs text-[#5B6475] sm:block">
                      {formatDateShort(entry.achievedAt)}
                    </span>

                    <div className="hidden justify-end sm:flex">
                      {isSignedIn && !isMe && (
                        <button
                          type="button"
                          title="Report player or score"
                          aria-label={`Report ${entry.usernameDisplay}`}
                          onClick={() => setReportingEntry(entry)}
                          className="rounded-lg p-1.5 text-[#8E98AB] transition-colors hover:bg-[#FFF0F3] hover:text-[#E5394D]"
                        >
                          <FlagIcon className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {loadingMore && (
              <div className="flex items-center justify-center gap-2 py-4 text-xs text-[#5B6475]">
                <Loader2 className="h-4 w-4 animate-spin text-[#2F6BFF]" />
                Loading more players...
              </div>
            )}
          </div>
        )}
      </div>

      {/* Report modal */}
      {reportingEntry && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Report leaderboard entry"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1220]/40 p-4 backdrop-blur-xs"
        >
          <div className="arcade-card w-full max-w-md p-6">
            <h2 className="font-heading text-lg font-bold text-[#0B1220]">
              Report {reportingEntry.usernameDisplay}
            </h2>
            <p className="mt-1 text-sm text-[#5B6475]">
              Tell moderators why this username or score looks suspicious.
            </p>
            <form onSubmit={submitReport} className="mt-4 space-y-4">
              <Input
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                maxLength={200}
                placeholder="e.g. Impossible score or offensive username"
                required
              />
              {reportStatus === "sent" && (
                <p className="text-sm font-medium text-[#19B37D]">
                  Report submitted. Thank you!
                </p>
              )}
              {reportStatus === "error" && (
                <p className="text-sm font-medium text-[#E5394D]">
                  Could not submit report. Please try again.
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setReportingEntry(null);
                    setReportReason("");
                    setReportStatus(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  size="sm"
                  disabled={reportStatus === "submitting"}
                >
                  Submit report
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
