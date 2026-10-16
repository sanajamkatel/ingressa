"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CloudIcon,
  LeafIcon,
  DropletIcon,
  EmberIcon,
  MailDriftIcon,
  CompassDriftIcon,
} from "@/components/theme-kit/icons";
import { BendButton, DissolveListItem, LiftCard, GlideTabs } from "@/components/theme-kit/motion";

const ICONS = [
  { Icon: CloudIcon, label: "Cloud" },
  { Icon: LeafIcon, label: "Leaf" },
  { Icon: DropletIcon, label: "Droplet" },
  { Icon: EmberIcon, label: "Ember" },
  { Icon: MailDriftIcon, label: "Mail" },
  { Icon: CompassDriftIcon, label: "Compass" },
];

const TABS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "applications", label: "Applications" },
  { id: "settings", label: "Settings" },
];

const TAB_CONTENT: Record<string, string> = {
  dashboard: "A calm overview of everything in motion.",
  applications: "Every application, drifting gently into place.",
  settings: "Quiet controls, soft edges.",
};

let nextItemId = 1;

export default function ThemePreviewPage() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [items, setItems] = useState([
    { id: 0, label: "Acme Corp — Software Engineer" },
    { id: -1, label: "Globex — Product Designer" },
  ]);

  const addItem = () => {
    nextItemId += 1;
    setItems((prev) => [...prev, { id: nextItemId, label: `New entry #${nextItemId}` }]);
  };

  const removeItem = (id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div
      className="min-h-screen px-6 pb-24 pt-28 sm:px-10"
      style={{
        background: "linear-gradient(180deg, #FDF9EF 0%, #FAF2E2 55%, #F3E8D2 100%)",
      }}
    >
      <div className="mx-auto max-w-4xl">
        <p className="text-sm font-medium uppercase tracking-wide text-[#9B7B4A]">
          Sandboxed preview — nothing here touches the real app
        </p>
        <h1
          className="mt-2 text-4xl font-semibold tracking-tight text-[#3E2F1C] sm:text-5xl"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          A softer, slower interface
        </h1>
        <p className="mt-3 max-w-xl text-[#6B5A3E]">
          Original icons, warm pastel tones, and a slower, floatier motion language — no
          borrowed characters, just the mood.
        </p>

        {/* Icon showcase */}
        <section className="mt-12">
          <h2 className="text-lg font-semibold text-[#3E2F1C]">Icons</h2>
          <div className="mt-4 grid grid-cols-3 gap-4 sm:grid-cols-6">
            {ICONS.map(({ Icon, label }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-2 rounded-2xl border border-[#E3D6B8] bg-white/60 p-4"
              >
                <Icon className="h-12 w-12" />
                <span className="text-xs text-[#6B5A3E]">{label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Tabs + glide transition */}
        <section className="mt-12">
          <h2 className="text-lg font-semibold text-[#3E2F1C]">Tabs with a gliding indicator</h2>
          <div className="mt-4">
            <GlideTabs tabs={TABS} activeId={activeTab} onChange={setActiveTab} />
          </div>
          <div className="mt-4 overflow-hidden rounded-2xl border border-[#E3D6B8] bg-white/60 p-6">
            <AnimatePresence mode="wait">
              <motion.p
                key={activeTab}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="text-[#6B5A3E]"
              >
                {TAB_CONTENT[activeTab]}
              </motion.p>
            </AnimatePresence>
          </div>
        </section>

        {/* Lift cards */}
        <section className="mt-12">
          <h2 className="text-lg font-semibold text-[#3E2F1C]">Hover lift</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {["Applied", "Interviewing", "Offer"].map((label) => (
              <LiftCard
                key={label}
                className="cursor-default rounded-2xl border border-[#E3D6B8] bg-white/70 p-5"
              >
                <p className="font-medium text-[#3E2F1C]">{label}</p>
                <p className="mt-1 text-sm text-[#8A7853]">Hover me</p>
              </LiftCard>
            ))}
          </div>
        </section>

        {/* Bend button + dissolve list */}
        <section className="mt-12">
          <h2 className="text-lg font-semibold text-[#3E2F1C]">
            Spring button &amp; dissolve-on-remove list
          </h2>
          <div className="mt-4">
            <BendButton
              onClick={addItem}
              className="rounded-full bg-[#C8631B] px-5 py-3 text-sm font-medium text-white shadow-sm"
            >
              Add entry
            </BendButton>
          </div>

          <ul className="mt-4 space-y-2">
            <AnimatePresence initial={false}>
              {items.map((item) => (
                <DissolveListItem
                  key={item.id}
                  className="flex items-center justify-between rounded-xl border border-[#E3D6B8] bg-white/70 px-4 py-3"
                >
                  <span className="text-sm text-[#3E2F1C]">{item.label}</span>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-xs font-medium text-[#C8631B] hover:underline"
                  >
                    Remove
                  </button>
                </DissolveListItem>
              ))}
            </AnimatePresence>
          </ul>
        </section>
      </div>
    </div>
  );
}
