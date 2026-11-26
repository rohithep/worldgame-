"use client";

import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Check, Copy, Download, ShieldAlert, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SITE_NAME } from "@/lib/constants";

interface SaveLoginCardProps {
  usernameDisplay: string;
  pin: string;
  onContinue: () => void;
}

export function SaveLoginCard({
  usernameDisplay,
  pin,
  onContinue,
}: SaveLoginCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  async function handleCopy() {
    const text = `${SITE_NAME} Login\nUsername: ${usernameDisplay}\nPIN: ${pin}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback ignored if clipboard blocked
    }
  }

  async function handleDownloadPng() {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#0B101B",
      });
      const link = document.createElement("a");
      link.download = `world-scoreboard-login-${usernameDisplay.toLowerCase()}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      // ignore
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div
        role="alert"
        className="flex items-start gap-3 rounded-2xl border border-[#FFB020]/40 bg-[#FFF8E8] p-4 text-sm text-[#7A4D00]"
      >
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#D98200]" aria-hidden="true" />
        <p className="font-medium leading-relaxed">
          Screenshot this now. We can&apos;t show your PIN again and we can&apos;t recover it.
        </p>
      </div>

      <div
        ref={cardRef}
        className="relative overflow-hidden rounded-[24px] border border-[#E8A849]/35 bg-gradient-to-br from-[#0F1624] via-[#0B101B] to-[#141C2E] p-7 shadow-[0_24px_60px_-16px_rgba(0,0,0,0.85)]"
      >
        <div className="mb-5 flex items-center justify-between">
          <span className="font-heading text-sm font-bold text-[#E8A849]">
            {SITE_NAME}
          </span>
          <span className="rounded-full bg-[#E8A849]/15 px-3 py-1 text-xs font-semibold text-[#F7D186]">
            Player Pass
          </span>
        </div>

        <div className="space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#9AA3B2]">
              Username
            </p>
            <p
              data-testid="saved-username"
              className="mt-1 font-heading text-3xl font-bold tracking-tight text-[#F4F1EA] sm:text-4xl"
            >
              {usernameDisplay}
            </p>
          </div>

          <div className="rounded-2xl border border-white/12 bg-[#070A12] px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#9AA3B2]">
              6-Digit PIN
            </p>
            <p
              data-testid="saved-pin"
              className="font-score mt-1 text-4xl font-bold tracking-[0.28em] text-[#E8A849] sm:text-5xl"
            >
              {pin}
            </p>
          </div>
        </div>

        <p className="mt-5 text-xs text-[#9AA3B2]">
          Keep this private. A lost PIN means a lost account.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Button type="button" variant="secondary" onClick={handleCopy}>
          {copied ? (
            <>
              <Check className="h-4 w-4 text-[#19B37D]" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              Copy login
            </>
          )}
        </Button>

        <Button
          type="button"
          variant="secondary"
          onClick={handleDownloadPng}
          disabled={downloading}
        >
          <Download className="h-4 w-4" />
          {downloading ? "Saving PNG..." : "Download as PNG"}
        </Button>
      </div>

      <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-2xl border border-[#E6EAF2] bg-white px-4 py-3 text-sm font-medium text-[#0B1220]">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="h-5 w-5 rounded accent-[#2F6BFF]"
        />
        <span>I saved my username and 6-digit PIN</span>
      </label>

      <Button
        type="button"
        size="lg"
        className="w-full"
        disabled={!confirmed}
        onClick={onContinue}
      >
        Continue to the Arcade
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
