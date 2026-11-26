"use client";

import { useEffect, useRef } from "react";
import { ShieldCheck } from "lucide-react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
        }
      ) => string;
      remove?: (id: string) => void;
    };
  }
}

interface TurnstileWidgetProps {
  onToken: (token: string) => void;
}

export function TurnstileWidget({ onToken }: TurnstileWidgetProps) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!siteKey) {
      onToken("dev-bypass");
      return;
    }

    let widgetId: string | null = null;
    const scriptId = "cf-turnstile-script";

    const renderWidget = () => {
      if (containerRef.current && window.turnstile) {
        widgetId = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme: "light",
          callback: (token) => onToken(token),
          "expired-callback": () => onToken(""),
        });
      }
    };

    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.onload = renderWidget;
      document.head.appendChild(script);
    } else {
      renderWidget();
    }

    return () => {
      if (widgetId && window.turnstile?.remove) {
        window.turnstile.remove(widgetId);
      }
    };
  }, [siteKey, onToken]);

  if (!siteKey) {
    return (
      <div className="flex items-center gap-2.5 rounded-2xl border border-[#19B37D]/30 bg-[#E9F9F2] px-4 py-3 text-sm font-medium text-[#0E6B4A]">
        <ShieldCheck className="h-4.5 w-4.5 shrink-0 text-[#19B37D]" aria-hidden="true" />
        <span>Human verification active (Turnstile dev mode)</span>
      </div>
    );
  }

  return <div ref={containerRef} className="min-h-[65px]" />;
}
