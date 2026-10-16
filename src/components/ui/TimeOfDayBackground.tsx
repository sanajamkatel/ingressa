"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { useReducedMotion } from "@/components/animations/useReducedMotion";

function isDarkTheme(): boolean {
  return document.documentElement.getAttribute("data-theme") === "dark";
}

export function TimeOfDayBackground() {
  const [mounted, setMounted] = useState(false);
  const [isNight, setIsNight] = useState(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    setIsNight(isDarkTheme());
    setMounted(true);

    // ThemeToggle sets data-theme directly on <html> with no accompanying event —
    // watch the attribute itself so the background crossfades the instant the user
    // flips light/dark, not just on next mount.
    const observer = new MutationObserver(() => setIsNight(isDarkTheme()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  // Depends on the live data-theme attribute, which the server can't know ahead of
  // the client's stored preference — render nothing until mounted to avoid a
  // hydration mismatch.
  if (!mounted) return null;

  return (
    <div
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      {/* 1. Day sky */}
      <motion.div
        className="absolute inset-0"
        initial={false}
        animate={{ opacity: isNight ? 0 : 1 }}
        transition={{ duration: reducedMotion ? 0 : 1.8, ease: "easeInOut" }}
      >
        <Image
          src="/background_images/background_day.png"
          alt=""
          fill
          priority
          className="object-cover"
        />
      </motion.div>

      {/* 2. Night sky */}
      <motion.div
        className="absolute inset-0"
        initial={false}
        animate={{ opacity: isNight ? 1 : 0 }}
        transition={{ duration: reducedMotion ? 0 : 1.8, ease: "easeInOut" }}
      >
        <Image
          src="/background_images/background_night.png"
          alt=""
          fill
          priority
          className="object-cover"
        />
      </motion.div>

      {/* 3. Ambient scrim — light mode: fully transparent (no white cast on the day
         photo); dark mode: a theme-aware tint for text contrast. See globals.css. */}
      <div className="absolute inset-0" style={{ background: "var(--bg-image-scrim)" }} />
    </div>
  );
}
