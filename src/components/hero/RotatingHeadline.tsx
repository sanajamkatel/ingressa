"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useReducedMotion } from "@/components/animations/useReducedMotion";

const ROTATING_STEPS = [
  {
    text: "ingest",
    textClass: "text-brand",
    bgClass: "bg-brand/10",
    borderClass: "border-brand/25",
    dotClass: "bg-brand",
  },
  {
    text: "parse",
    textClass: "text-accent-coral",
    bgClass: "bg-accent-coral/10",
    borderClass: "border-accent-coral/25",
    dotClass: "bg-accent-coral",
  },
  {
    text: "deduplicate",
    textClass: "text-accent-emerald",
    bgClass: "bg-accent-emerald/10",
    borderClass: "border-accent-emerald/25",
    dotClass: "bg-accent-emerald",
  },
  {
    text: "organize",
    textClass: "text-nav-settings",
    bgClass: "bg-nav-settings/10",
    borderClass: "border-nav-settings/25",
    dotClass: "bg-nav-settings",
  },
] as const;

const ROTATE_INTERVAL_MS = 2400;

export function RotatingHeadline() {
  const [index, setIndex] = useState(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % ROTATING_STEPS.length);
    }, ROTATE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  const current = ROTATING_STEPS[index];

  return (
    <h1 className="flex flex-wrap items-center gap-x-3 gap-y-2 text-5xl font-semibold leading-[1.05] tracking-tight text-fg sm:text-6xl">
      <span>An automated system to</span>

      <motion.span
        layout={!reducedMotion}
        transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 350, damping: 28 }}
        className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 transition-colors duration-300 ${current.bgClass} ${current.borderClass}`}
      >
        <span className={`h-2 w-2 shrink-0 rounded-full ${current.dotClass}`} aria-hidden="true" />

        <span className="relative inline-block h-9 overflow-hidden sm:h-11">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={current.text}
              initial={reducedMotion ? { opacity: 0 } : { y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={reducedMotion ? { opacity: 0 } : { y: -20, opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              className={`block text-3xl font-semibold sm:text-4xl ${current.textClass}`}
            >
              {current.text}
            </motion.span>
          </AnimatePresence>
        </span>
      </motion.span>

      <span>your entire job search into one place.</span>
    </h1>
  );
}
