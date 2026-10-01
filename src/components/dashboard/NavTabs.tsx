"use client";

import React from "react";
import { motion } from "framer-motion";
import { BarChart3, GitCompareArrows, Map, MessageCircle, NotebookPen, Radio, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type ModuleId = "intencion" | "espectro" | "mapa" | "personajes" | "temas" | "candidato" | "sugerencias";
type Tab = { id: ModuleId; label: string; hint: string; icon: LucideIcon };
const TABS: Tab[] = [
  { id: "intencion", label: "Intención de voto", hint: "Señales", icon: BarChart3 },
  { id: "espectro", label: "Espectro del voto", hint: "Comparar", icon: GitCompareArrows },
  { id: "mapa", label: "Mapa", hint: "Territorio", icon: Map },
  { id: "personajes", label: "Personajes", hint: "Actores", icon: Users },
  { id: "temas", label: "Temas ciudadanos", hint: "Agenda", icon: MessageCircle },
  { id: "candidato", label: "Temas del candidato", hint: "Reacción", icon: Radio },
  { id: "sugerencias", label: "Sugerencias", hint: "Temas", icon: NotebookPen },
];

export default function NavTabs({ active, onChange }: { active: ModuleId; onChange: (m: ModuleId) => void }) {
  return (
    <nav aria-label="Módulos de análisis" className="relative z-20 flex gap-1 overflow-x-auto border-b border-border-soft/80 bg-panel/65 px-3 backdrop-blur-xl [scrollbar-width:none] sm:px-5">
      {TABS.map((t, index) => {
        const Icon = t.icon;
        const isActive = active === t.id;
        return (
          <motion.button key={t.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.035, duration: 0.3 }} onClick={() => onChange(t.id)} aria-current={isActive ? "page" : undefined} className={(isActive ? "text-fg " : "text-muted hover:text-fg ") + "group relative flex shrink-0 items-center gap-2 whitespace-nowrap px-3 py-3 text-left transition-colors sm:px-3.5"}>
            <Icon className={(isActive ? "text-accent " : "text-faint group-hover:text-accent ") + "h-3.5 w-3.5 transition-colors"} strokeWidth={isActive ? 2.2 : 1.8} />
            <span><span className="block text-[12px] font-semibold tracking-tight sm:text-[13px]">{t.label}</span><span className="hidden text-[9px] uppercase tracking-[0.16em] text-faint sm:block">{t.hint}</span></span>
            {isActive && <motion.span layoutId="nav-indicator" className="absolute inset-x-2 bottom-0 h-[3px] rounded-t-full bg-gradient-to-r from-accent via-accent2 to-signal" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
          </motion.button>
        );
      })}
    </nav>
  );
}
