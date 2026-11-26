"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  KeyRound,
  LogOut,
  Trash2,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CountryFlag } from "@/components/ui/flag";
import { GameAsset } from "@/components/game-asset";
import { GAMES, type GameSlug } from "@/lib/constants";
import { formatDateShort, formatScore } from "@/lib/utils";
import { fetchSafe } from "@/lib/fetch-client";
import { validatePin } from "@/lib/validators";

export interface ProfileScoreRow {
  slug: GameSlug;
  bestScore: number;
  plays: number;
  rank: number | null;
  totalPlayers: number | null;
}

interface ProfileClientProps {
  player: {
    username: string;
    usernameDisplay: string;
    countryCode: string;
    countryName: string;
    createdAt: string;
  };
  scores: Record<string, ProfileScoreRow>;
}

export function ProfileClient({ player, scores }: ProfileClientProps) {
  const router = useRouter();

  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinMsg, setPinMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pinLoading, setPinLoading] = useState(false);

  const [deletePin, setDeletePin] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  async function handleChangePin(e: React.FormEvent) {
    e.preventDefault();
    setPinMsg(null);

    if (newPin !== confirmPin) {
      setPinMsg({ ok: false, text: "New PINs do not match." });
      return;
    }
    const check = validatePin(newPin);
    if (!check.valid) {
      setPinMsg({ ok: false, text: check.error || "Invalid PIN." });
      return;
    }

    setPinLoading(true);
    const res = await fetchSafe<{ ok?: boolean; error?: string }>("/api/auth/change-pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPin, newPin }),
    });
    setPinLoading(false);

    if (!res.ok || !res.data?.ok) {
      if (res.sessionExpired) {
        setPinMsg({ ok: false, text: "Session expired. Redirecting to sign in..." });
        setTimeout(() => router.push("/join?mode=returning"), 1200);
        return;
      }
      setPinMsg({ ok: false, text: res.error || "Could not change PIN." });
    } else {
      setPinMsg({ ok: true, text: "PIN updated! Remember to save your new PIN." });
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
    }
  }

  async function handleDeleteAccount(e: React.FormEvent) {
    e.preventDefault();
    setDeleteError(null);
    setDeleteLoading(true);
    const res = await fetchSafe<{ ok?: boolean; error?: string }>("/api/auth/delete-account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: deletePin }),
    });
    setDeleteLoading(false);

    if (!res.ok || !res.data?.ok) {
      if (res.sessionExpired) {
        setDeleteError("Your session expired. Please sign in again.");
        return;
      }
      setDeleteError(res.error || "Could not delete account.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="space-y-8">
      {/* Player summary */}
      <div className="arcade-card flex flex-wrap items-center justify-between gap-4 p-6 sm:p-8">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="font-heading text-3xl font-bold text-[#0B1220]">
              {player.usernameDisplay}
            </h1>
            <CountryFlag code={player.countryCode} label={player.countryName} className="h-5 w-7" />
          </div>
          <p className="text-sm text-[#5B6475]">
            {player.countryName} • Joined {formatDateShort(player.createdAt)}
          </p>
        </div>

        <Button type="button" variant="secondary" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>

      {/* Personal bests across all 9 games */}
      <section className="space-y-4">
        <h2 className="font-heading text-xl font-bold text-[#0B1220]">
          Your Bests & Global Ranks
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {GAMES.map((game) => {
            const row = scores[game.slug];
            return (
              <div key={game.slug} className="arcade-card flex flex-col justify-between p-5">
                <div className="flex items-center gap-3">
                  <GameAsset
                    src={game.assetPng}
                    alt={game.name}
                    accent={game.accent}
                    gradient={game.gradient}
                    isRotatingHue={game.isRotatingHue}
                    className="h-11 w-11 shrink-0"
                    iconSize="h-5 w-5"
                  />
                  <div className="min-w-0">
                    <h3 className="font-heading truncate font-bold text-[#0B1220]">
                      {game.name}
                    </h3>
                    <p className="text-xs text-[#5B6475]">
                      {row ? `${row.plays} play${row.plays === 1 ? "" : "s"}` : "Not played yet"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-baseline justify-between border-t border-[#E6EAF2] pt-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase text-[#5B6475]">Best</p>
                    <p className="font-score text-lg font-bold text-[#0B1220]">
                      {row ? formatScore(game.slug, row.bestScore) : "—"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-semibold uppercase text-[#5B6475]">Rank</p>
                    <p className="font-score text-lg font-bold text-[#2F6BFF]">
                      {row?.rank ? `#${row.rank.toLocaleString("en-US")}` : "—"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button asChild size="sm" className="flex-1">
                    <Link href={`/games/${game.slug}`}>
                      Play <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                  <Button asChild variant="secondary" size="sm">
                    <Link href={`/leaderboard/${game.slug}`} aria-label={`${game.name} board`}>
                      <Trophy className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Account Security: Change PIN + Delete Account */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="arcade-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-[#2F6BFF]" />
            <h2 className="font-heading text-lg font-bold text-[#0B1220]">
              Change 6-Digit PIN
            </h2>
          </div>
          <form onSubmit={handleChangePin} className="space-y-3">
            <Input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="Current 6-digit PIN"
              aria-label="Current 6-digit PIN"
              className="font-score tracking-[0.2em]"
              required
            />
            <Input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="New 6-digit PIN"
              aria-label="New 6-digit PIN"
              className="font-score tracking-[0.2em]"
              required
            />
            <Input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="Confirm new 6-digit PIN"
              aria-label="Confirm new 6-digit PIN"
              className="font-score tracking-[0.2em]"
              required
            />
            {pinMsg && (
              <p
                className={`text-sm font-medium ${
                  pinMsg.ok ? "text-[#19B37D]" : "text-[#E5394D]"
                }`}
              >
                {pinMsg.text}
              </p>
            )}
            <Button type="submit" disabled={pinLoading}>
              {pinLoading ? "Updating..." : "Update PIN"}
            </Button>
          </form>
        </div>

        <div className="arcade-card border-[#FF4D6A]/25 p-6">
          <div className="mb-4 flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-[#E5394D]" />
            <h2 className="font-heading text-lg font-bold text-[#0B1220]">
              Delete Account
            </h2>
          </div>
          <p className="mb-4 text-sm text-[#5B6475]">
            Permanently removes your profile, private details, and all leaderboard scores. This cannot be undone.
          </p>
          <form onSubmit={handleDeleteAccount} className="space-y-3">
            <Input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={deletePin}
              onChange={(e) => setDeletePin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="Enter 6-digit PIN to confirm"
              aria-label="PIN to confirm account deletion"
              className="font-score tracking-[0.2em]"
              required
            />
            {deleteError && (
              <p className="text-sm font-medium text-[#E5394D]">{deleteError}</p>
            )}
            <Button
              type="submit"
              variant="danger"
              disabled={deleteLoading || deletePin.length !== 6}
            >
              {deleteLoading ? "Deleting..." : "Permanently Delete Account"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
