"use client";

import { motion } from "framer-motion";
import { useReducedMotion } from "@/components/animations/useReducedMotion";
import { STATUS_META } from "@/lib/application-display";
import type { DashboardFunnel } from "@/lib/dashboard";

const STAGES: Array<{
  key: keyof DashboardFunnel;
  label: string;
  statusKey: keyof typeof STATUS_META;
}> = [
  { key: "applied", label: "Applied", statusKey: "applied" },
  { key: "screening", label: "Screening", statusKey: "oa" },
  { key: "interviewing", label: "Interviewing", statusKey: "interview" },
  { key: "offer", label: "Offer", statusKey: "offer" },
  { key: "rejected", label: "Rejected", statusKey: "rejected" },
];

interface FunnelChartProps {
  funnel: DashboardFunnel;
}

export function FunnelChart({ funnel }: FunnelChartProps) {
  const reducedMotion = useReducedMotion();
  const max = Math.max(1, ...STAGES.map((stage) => funnel[stage.key]));

  return (
    <div className="space-y-4">
      {STAGES.map((stage) => {
        const count = funnel[stage.key];
        const widthPercent = count === 0 ? 2 : Math.max(4, (count / max) * 100);
        const fillColor = STATUS_META[stage.statusKey].bg.replace("/10", "");

        return (
          <div key={stage.key}>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-fg">{stage.label}</span>
              <span className="text-fg-muted">{count}</span>
            </div>
            <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-bg-elevated">
              <motion.div
                className={`h-full rounded-full ${fillColor}`}
                initial={reducedMotion ? { width: `${widthPercent}%` } : { width: 0 }}
                animate={{ width: `${widthPercent}%` }}
                transition={{ duration: reducedMotion ? 0 : 0.5, ease: "easeOut" }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
