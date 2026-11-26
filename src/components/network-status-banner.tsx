"use client";

import { useEffect, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";

export function NetworkStatusBanner() {
  const [status, setStatus] = useState<"online" | "offline" | "reconnected">("online");

  useEffect(() => {
    const handleOffline = () => setStatus("offline");
    const handleOnline = () => {
      setStatus("reconnected");
      setTimeout(() => setStatus("online"), 3000);
    };

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      const t = setTimeout(() => setStatus("offline"), 0);
      return () => clearTimeout(t);
    }

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (status === "online") return null;

  return (
    <div
      role="status"
      aria-live="assertive"
      className={`fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2.5 rounded-full border px-4 py-2 text-xs font-semibold shadow-2xl backdrop-blur-xl ${
        status === "offline"
          ? "border-[#E5394D]/50 bg-[#1B0D12]/95 text-[#FF8A98]"
          : "border-[#19B37D]/50 bg-[#0B1F19]/95 text-[#5CE6B5]"
      }`}
    >
      {status === "offline" ? (
        <>
          <WifiOff className="h-3.5 w-3.5 shrink-0" />
          <span>No internet connection — scores &amp; boards paused</span>
        </>
      ) : (
        <>
          <Wifi className="h-3.5 w-3.5 shrink-0" />
          <span>Back online</span>
        </>
      )}
    </div>
  );
}
