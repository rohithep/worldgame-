import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { LeaderboardBoard } from "@/components/leaderboard-board";
import { GAME_BY_SLUG, isGameSlug } from "@/lib/constants";
import { getCurrentPlayer } from "@/lib/auth";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!isGameSlug(slug)) return { title: "Leaderboard" };
  const game = GAME_BY_SLUG[slug];
  return {
    title: `${game.name} Leaderboard`,
    description: `Global rankings for ${game.name}. Every player listed with country filter and instant rank lookup.`,
  };
}

export default async function LeaderboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!isGameSlug(slug)) notFound();

  const player = await getCurrentPlayer();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <LeaderboardBoard slug={slug} isSignedIn={Boolean(player)} />
      </main>
      <SiteFooter />
    </div>
  );
}
