"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, CheckCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchSafe } from "@/lib/fetch-client";
import { formatDateShort } from "@/lib/utils";

export interface AdminReportRow {
  id: string;
  reportedUserId: string;
  reportedUsername: string;
  gameSlug: string | null;
  reason: string;
  status: string;
  createdAt: string;
}

export interface AdminScoreRow {
  userId: string;
  usernameDisplay: string;
  isBanned: boolean;
  gameSlug: string;
  bestScore: number;
  updatedAt: string;
}

export function AdminClient({
  reports,
  recentScores,
}: {
  reports: AdminReportRow[];
  recentScores: AdminScoreRow[];
}) {
  const router = useRouter();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [actionBanner, setActionBanner] = useState<{ ok: boolean; text: string } | null>(null);

  async function runAction(key: string, body: Record<string, unknown>) {
    setBusyKey(key);
    setActionBanner(null);
    const res = await fetchSafe<{ ok?: boolean; error?: string }>("/api/admin/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusyKey(null);

    if (!res.ok || !res.data?.ok) {
      setActionBanner({
        ok: false,
        text: res.permissionDenied
          ? "Permission denied — admin access required."
          : res.sessionExpired
            ? "Session expired — please sign in again."
            : res.error || "Action failed.",
      });
      return;
    }

    setActionBanner({ ok: true, text: "Moderation action applied." });
    router.refresh();
  }

  return (
    <div className="space-y-8">
      {actionBanner && (
        <div
          role="status"
          className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
            actionBanner.ok
              ? "border-[#19B37D]/40 bg-[#19B37D]/15 text-[#5CE6B5]"
              : "border-[#E5394D]/40 bg-[#E5394D]/15 text-[#FF7A8A]"
          }`}
        >
          {actionBanner.text}
        </div>
      )}
      <section className="arcade-card p-6">
        <h2 className="font-heading text-xl font-bold text-[#0B1220]">
          Open & Recent Reports ({reports.length})
        </h2>
        {reports.length === 0 ? (
          <p className="mt-4 text-sm text-[#5B6475]">No player reports right now.</p>
        ) : (
          <div className="mt-4 divide-y divide-[#E6EAF2]">
            {reports.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-4 py-4 text-sm"
              >
                <div>
                  <p className="font-semibold text-[#0B1220]">
                    {r.reportedUsername}{" "}
                    {r.gameSlug && (
                      <span className="rounded-full bg-[#EEF2FA] px-2.5 py-0.5 text-xs text-[#5B6475]">
                        {r.gameSlug}
                      </span>
                    )}{" "}
                    <span className="text-xs uppercase text-[#2F6BFF]">[{r.status}]</span>
                  </p>
                  <p className="mt-1 text-[#5B6475]">{r.reason}</p>
                  <p className="text-xs text-[#8E98AB]">{formatDateShort(r.createdAt)}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={busyKey === `dismiss-${r.id}`}
                    onClick={() =>
                      runAction(`dismiss-${r.id}`, {
                        action: "update_report",
                        reportId: r.id,
                        status: "dismissed",
                      })
                    }
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    Dismiss
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="danger"
                    disabled={busyKey === `ban-${r.id}`}
                    onClick={async () => {
                      await runAction(`ban-${r.id}`, {
                        action: "set_ban",
                        userId: r.reportedUserId,
                        banned: true,
                      });
                      await runAction(`act-${r.id}`, {
                        action: "update_report",
                        reportId: r.id,
                        status: "actioned",
                      });
                    }}
                  >
                    <Ban className="h-3.5 w-3.5" />
                    Ban Player
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="arcade-card p-6">
        <h2 className="font-heading text-xl font-bold text-[#0B1220]">
          Recent Scores ({recentScores.length})
        </h2>
        <div className="mt-4 divide-y divide-[#E6EAF2]">
          {recentScores.map((s) => {
            const key = `${s.userId}:${s.gameSlug}`;
            return (
              <div
                key={key}
                className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
              >
                <div>
                  <span className="font-semibold text-[#0B1220]">
                    {s.usernameDisplay}
                  </span>{" "}
                  {s.isBanned && (
                    <span className="rounded bg-[#FFF0F3] px-2 py-0.5 text-xs font-bold text-[#E5394D]">
                      BANNED
                    </span>
                  )}
                  <span className="mx-2 text-[#8E98AB]">•</span>
                  <span className="text-[#5B6475]">{s.gameSlug}</span>
                  <span className="mx-2 text-[#8E98AB]">•</span>
                  <span className="font-score font-bold text-[#0B1220]">
                    {s.bestScore}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busyKey === `rm-${key}`}
                    onClick={() =>
                      runAction(`rm-${key}`, {
                        action: "remove_score",
                        userId: s.userId,
                        gameSlug: s.gameSlug,
                      })
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove Score
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={s.isBanned ? "secondary" : "danger"}
                    disabled={busyKey === `ban-${key}`}
                    onClick={() =>
                      runAction(`ban-${key}`, {
                        action: "set_ban",
                        userId: s.userId,
                        banned: !s.isBanned,
                      })
                    }
                  >
                    {s.isBanned ? "Unban" : "Ban"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
