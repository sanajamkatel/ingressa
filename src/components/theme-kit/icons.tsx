"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { useReducedMotion } from "@/components/animations/useReducedMotion";

export interface SoftIconProps {
  className?: string;
  /** Gentle idle drift — on by default, matches the soft/whimsical brief. */
  float?: boolean;
}

function useFloat(float: boolean, amplitude = 4, duration = 3.2) {
  const reducedMotion = useReducedMotion();
  if (!float || reducedMotion) return {};
  return {
    animate: { y: [0, -amplitude, 0] },
    transition: { duration, repeat: Infinity, ease: "easeInOut" as const },
  };
}

function SoftWrapper({
  float = true,
  amplitude,
  duration,
  className,
  children,
}: SoftIconProps & { amplitude?: number; duration?: number; children: ReactNode }) {
  const motionProps = useFloat(float, amplitude, duration);
  return (
    <motion.svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...motionProps}
    >
      {children}
    </motion.svg>
  );
}

/** Soft drifting cloud — pairs well with "pending" / air-adjacent states. */
export function CloudIcon(props: SoftIconProps) {
  return (
    <SoftWrapper {...props} amplitude={3} duration={4}>
      <defs>
        <linearGradient id="cloud-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFDF8" />
          <stop offset="100%" stopColor="#F3EEDD" />
        </linearGradient>
      </defs>
      <path
        d="M14 32c-5 0-8-4-8-8 0-4 3-7.5 7-8 1-5 5.5-8.5 11-8.5 5.8 0 10.5 4 11.5 9.3 4 .7 7 4 7 8.2 0 4.4-3.8 8-8.5 8H14Z"
        fill="url(#cloud-fill)"
        stroke="#D9CFAE"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </SoftWrapper>
  );
}

/** A single curled leaf — growth, new applications, fresh starts. */
export function LeafIcon(props: SoftIconProps) {
  return (
    <SoftWrapper {...props} amplitude={5} duration={3.4}>
      <defs>
        <linearGradient id="leaf-fill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#9ECE9A" />
          <stop offset="100%" stopColor="#5C9A63" />
        </linearGradient>
      </defs>
      <path
        d="M24 6c9 2 15 9 15 18.5C39 34 30 40 22 39 13 38 8 31 9 23 10 14 16 8 24 6Z"
        fill="url(#leaf-fill)"
      />
      <path
        d="M14 34C20 24 26 16 36 10"
        stroke="#3F7A48"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
        opacity="0.6"
      />
    </SoftWrapper>
  );
}

/** A rounded water droplet — screening / in-progress. */
export function DropletIcon(props: SoftIconProps) {
  return (
    <SoftWrapper {...props} amplitude={4} duration={3}>
      <defs>
        <linearGradient id="droplet-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9FC9E8" />
          <stop offset="100%" stopColor="#4C85B6" />
        </linearGradient>
      </defs>
      <path
        d="M24 6c6.5 8.4 12 16.2 12 22.6 0 7-5.4 12.4-12 12.4s-12-5.4-12-12.4C12 22.2 17.5 14.4 24 6Z"
        fill="url(#droplet-fill)"
      />
      <ellipse cx="20" cy="27" rx="3" ry="4.5" fill="#D9ECFA" opacity="0.5" />
    </SoftWrapper>
  );
}

/** A soft glowing ember — offers, high-priority, warmth. */
export function EmberIcon(props: SoftIconProps) {
  return (
    <SoftWrapper {...props} amplitude={3} duration={2.6}>
      <defs>
        <radialGradient id="ember-fill" cx="50%" cy="60%" r="60%">
          <stop offset="0%" stopColor="#FFD79A" />
          <stop offset="55%" stopColor="#E8914F" />
          <stop offset="100%" stopColor="#C8601F" />
        </radialGradient>
      </defs>
      <path
        d="M24 6c3 6-2 9-4 13-1.6 3.1-2 6.4-.5 9 .9-2 2.4-3.2 4-4 .3 2.6-.3 4.6-1.5 6.4 6.5 1.3 11-3 11-9 0-4.7-3-8.6-5-11-1.2-1.4-2.4-2.8-4-4.4Z"
        fill="url(#ember-fill)"
      />
    </SoftWrapper>
  );
}

/** A gently bobbing envelope — Gmail sync. */
export function MailDriftIcon(props: SoftIconProps) {
  return (
    <SoftWrapper {...props} amplitude={3} duration={3.6}>
      <defs>
        <linearGradient id="mail-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFDF8" />
          <stop offset="100%" stopColor="#F0E6CC" />
        </linearGradient>
      </defs>
      <rect x="7" y="13" width="34" height="24" rx="6" fill="url(#mail-fill)" stroke="#D9CFAE" strokeWidth="1.5" />
      <path
        d="M9 16l13.2 10a3 3 0 0 0 3.6 0L39 16"
        stroke="#C8631B"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </SoftWrapper>
  );
}

/** A soft compass — stats / dashboard. */
export function CompassDriftIcon(props: SoftIconProps) {
  return (
    <SoftWrapper {...props} amplitude={2} duration={4.2}>
      <defs>
        <linearGradient id="compass-fill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F6EFE1" />
          <stop offset="100%" stopColor="#E3D6B8" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="17" fill="url(#compass-fill)" stroke="#C9B98E" strokeWidth="1.5" />
      <path d="M24 13 L28 24 L24 35 L20 24 Z" fill="#9B5B2C" opacity="0.85" />
      <circle cx="24" cy="24" r="1.6" fill="#5C3A1E" />
    </SoftWrapper>
  );
}
