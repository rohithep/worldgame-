import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { LandingExperience } from "@/components/landing/landing-experience";
import { getCurrentPlayer } from "@/lib/auth";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/server";
import type { CountryCount } from "@/components/landing/world-map";

export default async function HomePage() {
  const player = await getCurrentPlayer();

  let stats = { totalPlayers: 0, totalScores: 0, totalPlays: 0 };
  let countryCounts: CountryCount[] = [];

  if (isSupabaseAdminConfigured()) {
    try {
      const admin = createSupabaseAdminClient();
      const [statsRes, countriesRes] = await Promise.all([
        admin.from("arcade_stats").select("*").maybeSingle(),
        admin.from("country_player_counts").select("*"),
      ]);

      if (statsRes.data) {
        stats = {
          totalPlayers: Number(statsRes.data.total_players ?? 0),
          totalScores: Number(statsRes.data.total_scores ?? 0),
          totalPlays: Number(statsRes.data.total_plays ?? 0),
        };
      }

      if (countriesRes.data) {
        countryCounts = countriesRes.data.map((r) => ({
          countryCode: r.country_code,
          countryName: r.country_name,
          playerCount: Number(r.player_count ?? 0),
        }));
      }
    } catch {
      // Gracefully render with zero stats if migrations haven't been run yet
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <LandingExperience
          stats={stats}
          countryCounts={countryCounts}
          isSignedIn={Boolean(player)}
        />
      </main>
      <div className="relative z-10">
        <SiteFooter />
      </div>
    </div>
  );
}
