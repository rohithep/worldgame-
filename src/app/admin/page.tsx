import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AdminClient, type AdminReportRow, type AdminScoreRow } from "@/components/admin-client";
import { getCurrentPlayer } from "@/lib/auth";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/server";

export const metadata = {
  title: "Moderation Admin",
};

export default async function AdminPage() {
  const player = await getCurrentPlayer();
  if (!player || !player.isAdmin) {
    redirect("/");
  }

  let reports: AdminReportRow[] = [];
  let recentScores: AdminScoreRow[] = [];

  if (isSupabaseAdminConfigured()) {
    const admin = createSupabaseAdminClient();

    const { data: reportRows } = await admin
      .from("reports")
      .select(
        "id, reported_user_id, game_slug, reason, status, created_at, profiles!reports_reported_user_id_fkey(username_display)"
      )
      .order("created_at", { ascending: false })
      .limit(50);

    reports = ((reportRows || []) as unknown as {
      id: string;
      reported_user_id: string;
      game_slug: string | null;
      reason: string;
      status: string;
      created_at: string;
      profiles?: { username_display?: string } | null;
    }[]).map((r) => ({
      id: r.id,
      reportedUserId: r.reported_user_id,
      reportedUsername: r.profiles?.username_display || r.reported_user_id.slice(0, 8),
      gameSlug: r.game_slug,
      reason: r.reason,
      status: r.status,
      createdAt: r.created_at,
    }));

    const { data: scoreRows } = await admin
      .from("scores")
      .select("user_id, game_slug, best_score, updated_at, profiles!inner(username_display, is_banned)")
      .order("updated_at", { ascending: false })
      .limit(40);

    recentScores = ((scoreRows || []) as unknown as {
      user_id: string;
      game_slug: string;
      best_score: number;
      updated_at: string;
      profiles: { username_display: string; is_banned: boolean };
    }[]).map((s) => ({
      userId: s.user_id,
      usernameDisplay: s.profiles.username_display,
      isBanned: s.profiles.is_banned,
      gameSlug: s.game_slug,
      bestScore: Number(s.best_score),
      updatedAt: s.updated_at,
    }));
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-widest text-[#2F6BFF]">
            Admin Console
          </p>
          <h1 className="font-heading text-3xl font-bold text-[#0B1220]">
            Moderation & Fair Play
          </h1>
        </div>
        <AdminClient reports={reports} recentScores={recentScores} />
      </main>
      <SiteFooter />
    </div>
  );
}
