import type { Metadata, Viewport } from "next";
import {
  Cinzel,
  Cormorant_Garamond,
  Geist_Mono,
  Outfit,
} from "next/font/google";
import "./globals.css";
import { SITE_NAME } from "@/lib/constants";
import { SmoothScrollProvider } from "@/components/smooth-scroll-provider";
import { NetworkStatusBanner } from "@/components/network-status-banner";

const cinzel = Cinzel({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${SITE_NAME} — Play. Score. Rank. Worldwide.`,
    template: `%s — ${SITE_NAME}`,
  },
  description:
    "9 crisp arcade games with uncapped global leaderboards. Join with a username and 6-digit PIN — no email, no phone, just play and rank worldwide.",
  openGraph: {
    title: `${SITE_NAME} — Play. Score. Rank. Worldwide.`,
    description:
      "9 crisp arcade games with uncapped global leaderboards. Play, score, and climb the worldwide ranks.",
    siteName: SITE_NAME,
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#04060A",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${cinzel.variable} ${cormorant.variable} ${outfit.variable} ${geistMono.variable}`}
    >
      <body className="arcade-noise min-h-screen bg-[#04060A] text-[#F4F1EA] antialiased selection:bg-[#E8A849]/25 selection:text-[#FCE3A6]">
        <SmoothScrollProvider>{children}</SmoothScrollProvider>
        <NetworkStatusBanner />
      </body>
    </html>
  );
}
