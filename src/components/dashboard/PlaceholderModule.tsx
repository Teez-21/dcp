"use client";

import React from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight, Check, Sparkles } from "lucide-react";

export default function PlaceholderModule({ icon: Icon, eyebrow, title, text, nextStep, cards }: { icon: LucideIcon; eyebrow: string; title: string; text: string; nextStep: string; cards: string[] }) {
  return (
    <div className="relative z-10 flex h-full items-center justify-center overflow-auto p-5 sm:p-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(700px_360px_at_50%_0%,color-mix(in_srgb,var(--accent2)_14%,transparent),transparent_60%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-panel/30 to-transparent" />
      <motion.div initial={{ opacity: 0, y: 18, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} whileHover={{ y: -5, rotateX: 1, rotateY: -0.5 }} transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }} className="interactive-lift relative w-full max-w-3xl overflow-hidden rounded-[1.7rem] border border-border-soft bg-panel/86 shadow-dossier-lg backdrop-blur-xl">
        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-accent2/10 blur-3xl" />
        <div className="relative grid gap-8 p-6 sm:p-9 md:grid-cols-[1.1fr_.9fr] md:gap-10">
          <div>
            <div className="mb-5 flex items-center gap-3"><motion.div initial={{ rotate: -8 }} animate={{ rotate: 0 }} transition={{ delay: 0.16, type: "spring", stiffness: 250, damping: 18 }} className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/20 to-accent2/20 text-accent shadow-[inset_0_0_0_1px_var(--border-soft)]"><Icon className="h-6 w-6" /></motion.div><div><p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-accent"><Sparkles className="h-3 w-3" />{eyebrow}</p><p className="mt-1 text-[11px] text-muted">Módulo preparado para tu próxima señal</p></div></div>
            <h2 className="max-w-xl font-display text-[28px] font-semibold leading-[1.07] tracking-tight sm:text-[34px]">{title}</h2><p className="mt-4 max-w-xl text-[13px] leading-relaxed text-muted sm:text-[14px]">{text}</p>
            <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-accent/20 bg-accent/8 p-3.5 text-[12px] leading-relaxed text-accent-ink"><ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0" /><span><b className="font-semibold">Siguiente movimiento</b><br />{nextStep}</span></div>
          </div>
          <div className="relative flex flex-col justify-end"><div className="mb-3 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.16em] text-faint"><span>Arquitectura del módulo</span><span className="font-mono text-signal">LISTO</span></div><div className="space-y-2.5">{cards.map((card, index) => <motion.div key={card} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.14 + index * 0.08, duration: 0.35 }} className="flex items-center gap-3 rounded-xl border border-border-soft bg-panel-soft/75 px-3.5 py-3 shadow-sm"><span className="flex h-6 w-6 items-center justify-center rounded-lg bg-signal/12 text-signal"><Check className="h-3.5 w-3.5" /></span><span className="text-[12px] font-medium text-fg">{card}</span><span className="ml-auto h-1.5 w-10 rounded-full bg-gradient-to-r from-accent/30 via-accent2/50 to-signal/80" /></motion.div>)}</div><div className="mt-5 overflow-hidden rounded-xl border border-border-soft bg-panel-2/60 p-3"><div className="mb-2 flex items-center justify-between text-[10px] text-muted"><span>Flujo de señal</span><span className="font-mono">— — —</span></div><div className="flex h-12 items-end gap-1.5 opacity-70">{[18, 32, 24, 42, 27, 38, 20, 30, 48, 34, 42, 26].map((height, i) => <motion.span key={i} initial={{ height: 0 }} animate={{ height: `${height}%` }} transition={{ delay: 0.2 + i * 0.025, duration: 0.45 }} className="flex-1 rounded-t-md bg-gradient-to-t from-accent/25 to-accent2/65" />)}</div></div></div>
        </div>
      </motion.div>
    </div>
  );
}
