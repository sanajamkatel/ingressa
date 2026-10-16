"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useReducedMotion } from "@/components/animations/useReducedMotion";

interface ToastProps {
  message: string | null;
  onDismiss: () => void;
  duration?: number;
}

export function Toast({ message, onDismiss, duration = 2500 }: ToastProps) {
  const reducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onDismiss]);

  if (!mounted) return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[110] flex justify-center px-4">
      <AnimatePresence>
        {message && (
          <motion.div
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
            transition={{ duration: reducedMotion ? 0.1 : 0.2, ease: "easeOut" }}
            className="pointer-events-auto rounded-full border border-border bg-bg-elevated px-5 py-3 text-sm font-medium text-fg shadow-[0_8px_24px_rgb(var(--shadow-color)/0.16)]"
          >
            {message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>,
    document.body
  );
}
