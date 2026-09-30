"use client";

import React from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

export default function PlaceholderModule({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="relative flex h-full items-center justify-center overflow-hidden p-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(700px_360px_at_50%_0%,color-mix(in_srgb,var(--accent2)_10%,transparent),transparent_60%)]" />
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative max-w-md rounded-2xl border border-border-soft bg-panel-soft/90 p-10 text-center shadow-dossier-lg backdrop-blur-sm"
      >
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/20 to-accent2/20 text-accent-ink shadow-[inset_0_0_0_1px_var(--border-soft)]">
          <Icon className="h-6 w-6" />
        </div>
        <h2 className="mb-2 font-display text-[20px] font-semibold">{title}</h2>
        <p className="text-[13px] leading-relaxed text-muted">{text}</p>
      </motion.div>
    </div>
  );
}
