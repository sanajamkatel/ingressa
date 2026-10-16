"use client";

import { useState, type MouseEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { NAV_ICONS } from "./icons";
import { NAV_GIFS } from "./gifs";
import { useReducedMotion } from "@/components/animations/useReducedMotion";
import { NAV_ACCENTS, type NavItem as NavItemType } from "@/lib/constants";

interface NavItemProps {
  item: NavItemType;
  isActive: boolean;
  onNavigate?: (href: string, event: MouseEvent) => void;
}

const EASE = [0.4, 0, 0.2, 1] as const;

const textVariants = {
  rest: {
    clipPath: "inset(0% 0 0% 0)",
    y: 0,
    opacity: 1,
    transition: { duration: 0.2, ease: EASE, delay: 0.08 },
  },
  hover: {
    clipPath: "inset(0% 0 100% 0)",
    y: -8,
    opacity: 0,
    transition: { duration: 0.18, ease: EASE },
  },
};

const animalVariants = {
  rest: {
    clipPath: "inset(100% 0 0% 0)",
    y: 8,
    opacity: 0,
    transition: { duration: 0.18, ease: EASE },
  },
  hover: {
    clipPath: "inset(0% 0 0% 0)",
    y: 0,
    opacity: 1,
    transition: { duration: 0.22, ease: EASE, delay: 0.06 },
  },
};

export function NavItem({ item, isActive, onNavigate }: NavItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [hasRevealed, setHasRevealed] = useState(false);
  const reducedMotion = useReducedMotion();

  const Icon = NAV_ICONS[item.key];
  const gifSrc = NAV_GIFS[item.key];
  const accent = NAV_ACCENTS[item.key];

  const activate = () => {
    setIsHovered(true);
    setHasRevealed(true);
  };
  const deactivate = () => setIsHovered(false);

  const variantState = isHovered ? "hover" : "rest";

  return (
    <Link
      href={item.href}
      aria-current={isActive ? "page" : undefined}
      onClick={(event) => onNavigate?.(item.href, event)}
      onMouseEnter={activate}
      onMouseLeave={deactivate}
      onFocus={activate}
      onBlur={deactivate}
      className="relative flex items-center justify-center px-4 py-2.5 sm:px-5"
    >
      {/* Mobile: compact static icon, no pointer hover available */}
      <Icon
        className={`h-[18px] w-[18px] transition-colors duration-200 sm:hidden ${
          isActive ? accent.text : "text-fg-subtle"
        }`}
      />

      {/* Desktop/tablet: label <-> mascot swap, stacked in one grid cell */}
      <span className="relative hidden h-7 overflow-hidden sm:grid sm:place-items-center">
        <motion.span
          variants={reducedMotion ? undefined : textVariants}
          animate={reducedMotion ? { opacity: isHovered ? 0 : 1 } : variantState}
          transition={reducedMotion ? { duration: 0.12 } : undefined}
          className={`col-start-1 row-start-1 whitespace-nowrap text-sm font-medium transition-colors duration-200 ${
            isActive ? accent.text : "text-fg-muted"
          }`}
        >
          {item.label}
        </motion.span>

        <motion.span
          variants={reducedMotion ? undefined : animalVariants}
          animate={reducedMotion ? { opacity: isHovered ? 1 : 0 } : variantState}
          transition={reducedMotion ? { duration: 0.12 } : undefined}
          className="col-start-1 row-start-1 flex items-center justify-center"
        >
          {hasRevealed && (
            <Image
              src={gifSrc}
              alt=""
              width={48}
              height={48}
              unoptimized
              className="h-7 w-7 rounded-full object-cover"
            />
          )}
        </motion.span>
      </span>

      {isActive && (
        <motion.span
          layoutId="nav-active-underline"
          className={`absolute bottom-1 left-1/2 h-[3px] w-5 -translate-x-1/2 rounded-full ${accent.bg}`}
          transition={{ type: "spring", stiffness: 500, damping: 35 }}
        />
      )}
    </Link>
  );
}
