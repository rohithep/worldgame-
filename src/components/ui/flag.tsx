"use client";

import * as Flags from "country-flag-icons/react/3x2";
import { cn } from "@/lib/utils";

interface CountryFlagProps {
  code: string;
  label?: string;
  className?: string;
}

export function CountryFlag({ code, label, className }: CountryFlagProps) {
  const upper = (code || "").toUpperCase();
  const FlagComponent = (Flags as Record<string, React.ComponentType<{ className?: string; title?: string }>>)[upper];

  if (!FlagComponent) {
    return (
      <span
        aria-label={label || upper}
        className={cn(
          "inline-flex h-4 w-6 items-center justify-center rounded-[3px] border border-[#E6EAF2] bg-[#EEF2FA] text-[9px] font-bold text-[#5B6475]",
          className
        )}
      >
        {upper || "?"}
      </span>
    );
  }

  return (
    <FlagComponent
      title={label || upper}
      className={cn(
        "inline-block h-4 w-6 shrink-0 rounded-[3px] shadow-[0_1px_2px_rgba(11,18,32,0.16)]",
        className
      )}
    />
  );
}
