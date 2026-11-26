"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { MotionConfig } from "framer-motion";

export function SmoothScrollProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Only run Lenis smooth wheel on desktop fine-pointer devices.
    // Mobile & touch devices keep native hardware-accelerated 60/120fps momentum scrolling.
    const isDesktopPointer =
      window.innerWidth >= 1024 && window.matchMedia("(pointer: fine)").matches;
    if (!isDesktopPointer) return;

    let rafId = 0;
    let cleanup: (() => void) | undefined;

    import("lenis")
      .then(({ default: Lenis }) => {
        const lenis = new Lenis({
          lerp: 0.085,
          smoothWheel: true,
          wheelMultiplier: 0.92,
          infinite: false,
        });

        const raf = (time: number) => {
          lenis.raf(time);
          rafId = requestAnimationFrame(raf);
        };
        rafId = requestAnimationFrame(raf);

        cleanup = () => {
          cancelAnimationFrame(rafId);
          lenis.destroy();
        };
      })
      .catch(() => {});

    return () => {
      cleanup?.();
    };
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);

  return (
    <MotionConfig
      reducedMotion="user"
      transition={{
        type: "spring",
        stiffness: 240,
        damping: 30,
        mass: 0.9,
      }}
    >
      {children}
    </MotionConfig>
  );
}
