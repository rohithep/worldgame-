import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { JoinFlow } from "@/components/join-flow";
import { getCurrentPlayer } from "@/lib/auth";
import { SITE_NAME } from "@/lib/constants";

export const metadata = {
  title: "Join the Arcade",
  description: `Create a ${SITE_NAME} player profile with a username and 6-digit PIN, or sign back in.`,
};

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const player = await getCurrentPlayer();
  if (player) {
    redirect("/games");
  }

  const sp = await searchParams;
  const initialMode = sp.mode === "returning" ? "returning" : "new";

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-12 sm:px-6">
        <div className="mb-6 text-center">
          <p className="cinema-kicker text-[#E8A849]">Player Pass</p>
          <h1 className="cinema-headline mt-2 font-heading text-3xl font-bold sm:text-4xl">
            {initialMode === "returning" ? "Welcome back" : "Enter the Arena"}
          </h1>
          <p className="mt-2 text-sm text-[#9AA3B2] sm:text-base">
            Username + 6-digit PIN. No email, no phone, no passwords to reset.
          </p>
        </div>

        <div className="arcade-card p-6 sm:p-8">
          <JoinFlow initialMode={initialMode} />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
