import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { MIN_AGE, SITE_NAME } from "@/lib/constants";

export const metadata = {
  title: "Privacy Notice",
  description: `How ${SITE_NAME} handles player data, public leaderboards, and account deletion.`,
};

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
        <div className="arcade-card space-y-6 p-7 sm:p-10">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#2F6BFF]">
              Minimal Data • Full Transparency
            </p>
            <h1 className="mt-1 font-heading text-3xl font-bold text-[#0B1220]">
              Privacy Notice
            </h1>
          </div>

          <section className="space-y-2">
            <h2 className="font-heading text-xl font-bold text-[#0B1220]">
              1. What we collect
            </h2>
            <p className="text-sm leading-relaxed text-[#5B6475]">
              {SITE_NAME} does not ask for your email address, phone number, or social media account.
              When you register, we store only:
            </p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-[#5B6475]">
              <li>Your chosen public username and a cryptographic hash derived from your 6-digit PIN (never the raw PIN).</li>
              <li>Your optional first name (kept strictly private).</li>
              <li>Your birth year (kept strictly private, used to enforce the minimum age of {MIN_AGE}).</li>
              <li>Your country, and optional state/province and district/city (state and district stay private and are used only for aggregate statistics).</li>
              <li>Your best score, play count, and timestamps for each game you play.</li>
              <li>A one-way salted hash of your IP address for rate-limiting and brute-force lockout protection.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="font-heading text-xl font-bold text-[#0B1220]">
              2. What is public
            </h2>
            <p className="text-sm leading-relaxed text-[#5B6475]">
              Only your <strong>username</strong>, <strong>country (flag and name)</strong>, and{" "}
              <strong>game scores</strong> appear publicly on leaderboards and share cards.
              Your name, birth year, state, and district are protected by database Row Level Security and are never exposed to other players or public APIs.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-heading text-xl font-bold text-[#0B1220]">
              3. Age requirements
            </h2>
            <p className="text-sm leading-relaxed text-[#5B6475]">
              Accounts require a minimum age of {MIN_AGE}. Younger players should have a parent or guardian&apos;s permission before using the site.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-heading text-xl font-bold text-[#0B1220]">
              4. Deleting your account and data
            </h2>
            <p className="text-sm leading-relaxed text-[#5B6475]">
              You can permanently delete your account, profile, and all submitted scores at any time from your{" "}
              <Link href="/me" className="font-semibold text-[#2F6BFF] hover:underline">
                Profile page (/me)
              </Link>{" "}
              by confirming your 6-digit PIN. Because we collect no email or recovery channel, a lost PIN cannot be recovered.
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
