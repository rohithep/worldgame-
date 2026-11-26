import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ExternalLink, Trophy } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CountryFlag } from "@/components/ui/flag";
import { GameAsset } from "@/components/game-asset";
import { GAME_BY_SLUG, isGameSlug, SITE_NAME } from "@/lib/constants";
import { formatDateShort, formatScore } from "@/lib/utils";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/server";

async function loadShareData(slug: string, username: string) {
  if (!isGameSlug(slug) || !isSupabaseAdminConfigured()) return null;
  const admin = createSupabaseAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, username, username_display, country_code, country_name, is_banned")
    .eq("username", username.toLowerCase())
    .maybeSingle();

  if (!profile || profile.is_banned) return null;

  const { data: rankRows } = await admin.rpc("get_player_rank", {
    p_game_slug: slug,
    p_user_id: profile.id,
    p_country_code: null,
  });

  const rankRow = rankRows?.[0] as
    | {
        rank: number;
        total_players: number;
        best_score: number;
        plays: number;
        achieved_at: string;
      }
    | undefined;

  return {
    username: profile.username,
    usernameDisplay: profile.username_display,
    countryCode: profile.country_code,
    countryName: profile.country_name,
    rank: rankRow ? Number(rankRow.rank) : null,
    totalPlayers: rankRow ? Number(rankRow.total_players) : null,
    bestScore: rankRow ? Number(rankRow.best_score) : null,
    achievedAt: rankRow?.achieved_at || null,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ game: string; username: string }>;
}) {
  const { game: slug, username } = await params;
  if (!isGameSlug(slug)) return { title: "Share Card" };
  const gameDef = GAME_BY_SLUG[slug];
  const data = await loadShareData(slug, username);
  const scoreLabel =
    data?.bestScore !== null && data?.bestScore !== undefined
      ? formatScore(slug, data.bestScore)
      : "Score";
  const ogUrl = `/api/og?game=${encodeURIComponent(slug)}&username=${encodeURIComponent(username)}`;

  return {
    title: `${data?.usernameDisplay || username} — ${scoreLabel} in ${gameDef.name}`,
    description: `Can you beat ${data?.usernameDisplay || username}'s score on ${SITE_NAME}?`,
    openGraph: {
      title: `${data?.usernameDisplay || username} scored ${scoreLabel} in ${gameDef.name}!`,
      description: `Global arcade rankings on ${SITE_NAME}.`,
      images: [{ url: ogUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      images: [ogUrl],
    },
  };
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ game: string; username: string }>;
}) {
  const { game: slug, username } = await params;
  if (!isGameSlug(slug)) notFound();

  const gameDef = GAME_BY_SLUG[slug];
  const data = await loadShareData(slug, username);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const shareUrl = `${siteUrl}/share/${slug}/${encodeURIComponent(username.toLowerCase())}`;
  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-12 sm:px-6">
        <div className="arcade-card relative overflow-hidden p-8 text-center">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-2"
            style={{ background: gameDef.gradient }}
          />

          <div className="mx-auto mb-4 flex justify-center">
            <GameAsset
              src={gameDef.assetPng}
              alt={gameDef.name}
              accent={gameDef.accent}
              gradient={gameDef.gradient}
              isRotatingHue={gameDef.isRotatingHue}
              className="h-16 w-16"
            />
          </div>

          <p className="text-xs font-bold uppercase tracking-widest text-[#2F6BFF]">
            {SITE_NAME} • {gameDef.name}
          </p>

          {data && data.bestScore !== null ? (
            <>
              <div className="mt-4 flex items-center justify-center gap-2">
                <CountryFlag code={data.countryCode} label={data.countryName} />
                <h1 className="font-heading text-2xl font-bold text-[#0B1220]">
                  {data.usernameDisplay}
                </h1>
              </div>

              <p
                className="font-score mt-5 text-5xl font-extrabold sm:text-6xl"
                style={{ color: gameDef.accent }}
              >
                {formatScore(slug, data.bestScore)}
              </p>

              <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#EEF4FF] px-4 py-2 text-sm font-bold text-[#2F6BFF]">
                <Trophy className="h-4 w-4" />
                <span>
                  Global Rank #{data.rank?.toLocaleString("en-US")} of{" "}
                  {data.totalPlayers?.toLocaleString("en-US")}
                </span>
              </div>

              {data.achievedAt && (
                <p className="mt-3 text-xs text-[#5B6475]">
                  Achieved {formatDateShort(data.achievedAt)}
                </p>
              )}
            </>
          ) : (
            <div className="py-6">
              <h1 className="font-heading text-2xl font-bold text-[#0B1220]">
                {username}
              </h1>
              <p className="mt-2 text-sm text-[#5B6475]">
                No verified database score found for this player in {gameDef.name}.
              </p>
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href={`/games/${slug}`}
              className="arcade-btn arcade-btn-primary inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-6 text-base font-semibold"
            >
              Beat my score
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href={`/leaderboard/${slug}`}
              className="arcade-btn arcade-btn-secondary inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-6 text-base font-semibold"
            >
              View Leaderboard
            </Link>
          </div>

          <div className="mt-6">
            <a
              href={linkedInUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5B6475] hover:text-[#0B1220]"
            >
              Post on LinkedIn
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
