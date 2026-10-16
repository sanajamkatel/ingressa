"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { MouseEventHandler, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps {
  children: ReactNode;
  href?: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  variant?: ButtonVariant;
  className?: string;
  disabled?: boolean;
}

const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary:
    "bg-brand text-brand-foreground shadow-[0_1px_2px_rgb(var(--shadow-color)/0.08),0_8px_20px_rgb(var(--shadow-color)/0.12)]",
  secondary:
    "bg-bg-elevated text-fg border border-border hover:border-border-strong",
  ghost: "text-fg-muted hover:text-fg",
  danger:
    "border border-accent-coral text-accent-coral bg-transparent hover:bg-accent-coral-soft",
};

export function Button({
  children,
  href,
  onClick,
  variant = "primary",
  className = "",
  disabled = false,
}: ButtonProps) {
  const sharedClassName = `inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-medium transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT_STYLES[variant]} ${className}`;

  return (
    <motion.div
      whileHover={disabled ? undefined : { scale: 1.03 }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="inline-block"
    >
      {href ? (
        <Link href={href} className={sharedClassName}>
          {children}
        </Link>
      ) : (
        <button type="button" onClick={onClick} disabled={disabled} className={sharedClassName}>
          {children}
        </button>
      )}
    </motion.div>
  );
}
