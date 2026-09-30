"use client";

import React from "react";
import { motion } from "framer-motion";

export type ModuleId = "intencion" | "espectro" | "mapa" | "personajes" | "temas" | "candidato" | "notas";

const TABS: { id: ModuleId; label: string }[] = [
  { id: "intencion", label: "Intención de voto" },
  { id: "espectro", label: "Espectro del voto" },
  { id: "mapa", label: "Mapa" },
  { id: "personajes", label: "Personajes" },
  { id: "temas", label: "Temas ciudadanos" },
  { id: "candidato", label: "Temas del candidato" },
  { id: "notas", label: "Notas" },
];

export default function NavTabs({ active, onChange }: { active: ModuleId; onChange: (m: ModuleId) => void }) {
  return (
    <nav className="relative z-20 flex gap-1 overflow-x-auto border-b border-border-soft bg-panel/70 px-5 backdrop-blur-md [scrollbar-width:none]">
      {TABS.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={
            "relative whitespace-nowrap px-3.5 py-3 text-[13.5px] font-medium tracking-tight transition-colors " +
            (active === t.id ? "text-fg" : "text-muted hover:text-fg")
          }
        >
          {t.label}
          {active === t.id && (
            <motion.span
              layoutId="nav-indicator"
              className="absolute inset-x-2 bottom-0 h-[2.5px] rounded-t-full bg-gradient-to-r from-accent to-accent2"
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
            />
          )}
        </button>
      ))}
    </nav>
  );
}
