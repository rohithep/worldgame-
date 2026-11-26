"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
  delay?: number;
}

/**
 * Smoked Obsidian Cinema Glass card.
 * Ultra-fast CSS transitions on mobile (zero per-card JS scroll observers or heavy blur orbs),
 * with pointer-tracking tungsten specular light on desktop fine-pointer devices.
 */
export function GlassCard({
  children,
  className,
  glowColor = "#E8A849",
}: GlassCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [spot, setSpot] = useState({ x: 50, y: 20, active: false });

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    if (typeof window !== "undefined" && window.innerWidth < 768) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setSpot({ x, y, active: true });
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={() => setSpot((s) => ({ ...s, active: false }))}
      className={cn("apple-glass arcade-card-hover group relative overflow-hidden", className)}
    >
      {/* Dynamic pointer-tracking tungsten specular highlight (desktop only) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 hidden transition-opacity duration-500 md:block"
        style={{
          opacity: spot.active ? 1 : 0,
          background: `radial-gradient(320px circle at ${spot.x}% ${spot.y}%, rgba(246, 200, 120, 0.14), transparent 60%)`,
        }}
      />
      {/* Subtle colored atmospheric glow (desktop only — avoids mobile GPU blur overhead) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-14 -top-14 hidden h-40 w-40 rounded-full opacity-[0.16] blur-3xl transition-opacity duration-500 group-hover:opacity-[0.3] md:block"
        style={{ background: glowColor }}
      />
      <div className="relative z-10 flex h-full flex-col justify-between">
        {children}
      </div>
    </div>
  );
}
