"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

interface ButtonProps {
  children: ReactNode;
  href: string;
  variant?: ButtonVariant;
  className?: string;
}

const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary:
    "bg-brand text-brand-foreground shadow-[0_1px_2px_rgb(var(--shadow-color)/0.08),0_8px_20px_rgb(var(--shadow-color)/0.12)]",
  secondary:
    "bg-bg-elevated text-fg border border-border hover:border-border-strong",
  ghost: "text-fg-muted hover:text-fg",
};

export function Button({
  children,
  href,
  variant = "primary",
  className = "",
}: ButtonProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="inline-block"
    >
      <Link
        href={href}
        className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-medium transition-colors duration-200 ${VARIANT_STYLES[variant]} ${className}`}
      >
        {children}
      </Link>
    </motion.div>
  );
}
