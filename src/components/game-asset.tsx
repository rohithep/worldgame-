"use client";

import { useState } from "react";
import {
  Globe2,
  Flag,
  Keyboard,
  Calculator,
  Type,
  Timer,
  Search,
  SlidersHorizontal,
  Palette,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICON_BY_NAME: Record<string, React.ComponentType<{ className?: string }>> = {
  globe: Globe2,
  "flag-pole": Flag,
  keycap: Keyboard,
  calculator: Calculator,
  "letter-tiles": Type,
  stopwatch: Timer,
  magnifier: Search,
  "ruler-slider": SlidersHorizontal,
  "color-swatch": Palette,
  "trophy-gold": Trophy,
  "trophy-silver": Trophy,
  "trophy-bronze": Trophy,
};

interface GameAssetProps {
  src: string;
  alt: string;
  accent?: string;
  gradient?: string;
  isRotatingHue?: boolean;
  className?: string;
  iconSize?: string;
}

/**
 * Renders the custom transparent PNG from /public/assets/png/ identically
 * on both phone and desktop (with automatic vector fallback if a path is missing).
 */
export function GameAsset({
  src,
  alt,
  accent = "#E8A849",
  gradient,
  isRotatingHue,
  className,
  iconSize = "h-6 w-6",
}: GameAssetProps) {
  const [failed, setFailed] = useState(false);

  const fileKey = src.split("/").pop()?.replace(/\.png$/i, "") || "globe";
  const Icon = ICON_BY_NAME[fileKey] || Globe2;

  if (!failed) {
    return (
      <div
        className={cn(
          "relative flex items-center justify-center select-none",
          isRotatingHue && "animate-hue-slow",
          className
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          width={128}
          height={128}
          decoding="async"
          onError={() => setFailed(true)}
          className="h-full w-full object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.55)]"
        />
      </div>
    );
  }

  return (
    <div
      aria-label={alt}
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-[26%] text-white ring-1 ring-inset ring-white/45 shadow-[0_14px_30px_-10px_rgba(0,0,0,0.45)]",
        isRotatingHue && "animate-hue-slow",
        className
      )}
      style={{
        background:
          gradient ||
          `radial-gradient(circle at 28% 20%, rgba(255,255,255,0.35), transparent 55%), linear-gradient(155deg, ${accent} 0%, ${accent}DD 100%)`,
      }}
    >
      <Icon className={cn(iconSize, "relative z-10 stroke-[1.9]")} />
    </div>
  );
}
