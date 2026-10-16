"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { MouseEvent, ReactNode } from "react";
import { useReducedMotion } from "@/components/animations/useReducedMotion";

// ---- BendButton: spring press + a soft impact ripple at the click point ----------
// Only accepts a deliberately small prop surface (not the full ButtonHTMLAttributes)
// since several native handlers (onDrag, onAnimationStart, ...) collide with
// Framer Motion's own prop types of the same name on motion.button.

interface BendButtonProps {
  children: ReactNode;
  className?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
}

export function BendButton({
  children,
  className = "",
  type = "button",
  disabled,
  onClick,
}: BendButtonProps) {
  const reducedMotion = useReducedMotion();
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const id = Date.now();
    setRipples((prev) => [...prev, { id, x: event.clientX - rect.left, y: event.clientY - rect.top }]);
    setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 650);
    onClick?.(event);
  };

  return (
    <motion.button
      type={type}
      disabled={disabled}
      whileHover={reducedMotion ? undefined : { scale: 1.03 }}
      whileTap={reducedMotion ? undefined : { scale: 0.95 }}
      transition={{ type: "spring", stiffness: 420, damping: 22 }}
      onClick={handleClick}
      className={`relative overflow-hidden ${className}`}
    >
      {children}
      {!reducedMotion && (
        <AnimatePresence>
          {ripples.map((ripple) => (
            <motion.span
              key={ripple.id}
              className="pointer-events-none absolute rounded-full bg-white/35"
              style={{ left: ripple.x, top: ripple.y, translateX: "-50%", translateY: "-50%" }}
              initial={{ width: 0, height: 0, opacity: 0.6 }}
              animate={{ width: 180, height: 180, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.65, ease: "easeOut" }}
            />
          ))}
        </AnimatePresence>
      )}
    </motion.button>
  );
}

// ---- DissolveListItem: flash, then fade + shrink + slide away on exit -----------
// Render inside the consumer's own <AnimatePresence> around a list — this only
// supplies the exit choreography for each item, as a single declarative keyframe
// sequence rather than separate flash/fade stages requiring extra state.

interface DissolveListItemProps {
  children: ReactNode;
  className?: string;
}

export function DissolveListItem({ children, className = "" }: DissolveListItemProps) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.li
      layout={!reducedMotion}
      initial={reducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={
        reducedMotion
          ? { opacity: 0 }
          : {
              backgroundColor: [
                "rgba(232,116,79,0)",
                "rgba(232,116,79,0.18)",
                "rgba(232,116,79,0.18)",
                "rgba(232,116,79,0)",
              ],
              opacity: [1, 1, 1, 0],
              scale: [1, 1, 1, 0.85],
              x: [0, 0, 0, -48],
            }
      }
      transition={{ duration: reducedMotion ? 0.15 : 0.6, times: [0, 0.15, 0.3, 1], ease: "easeInOut" }}
      className={className}
    >
      {children}
    </motion.li>
  );
}

// ---- LiftCard: hover float with a soft glow ---------------------------------------

interface LiftCardProps {
  children: ReactNode;
  className?: string;
}

export function LiftCard({ children, className = "" }: LiftCardProps) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      whileHover={
        reducedMotion
          ? undefined
          : {
              y: -4,
              boxShadow:
                "0 18px 34px rgba(139,94,42,0.16), 0 4px 10px rgba(139,94,42,0.10), 0 0 24px rgba(217,119,6,0.12)",
            }
      }
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ---- GlideTabs: a pill indicator that glides between tabs via layoutId -----------

export interface GlideTab {
  id: string;
  label: string;
}

interface GlideTabsProps {
  tabs: GlideTab[];
  activeId: string;
  onChange: (id: string) => void;
}

export function GlideTabs({ tabs, activeId, onChange }: GlideTabsProps) {
  return (
    <div className="inline-flex gap-1 rounded-full border border-border bg-bg-elevated p-1">
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className="relative rounded-full px-4 py-2 text-sm font-medium transition-colors"
          >
            {isActive && (
              <motion.span
                layoutId="glide-tab-pill"
                className="absolute inset-0 rounded-full bg-brand"
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
              />
            )}
            <span className={`relative z-10 ${isActive ? "text-brand-foreground" : "text-fg-muted"}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
