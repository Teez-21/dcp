"use client";

import React from "react";
import { motion } from "framer-motion";
import { Activity, Palette, Radar } from "lucide-react";
import { useDashboardStore } from "@/store/useDashboardStore";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

export default function Header() {
  const theme = useDashboardStore((s) => s.theme);
  const setTheme = useDashboardStore((s) => s.setTheme);
  const elections = useDashboardStore((s) => s.elections);
  const visible = useDashboardStore((s) => s.visible);
  const active = elections.find((e) => e.id === visible[visible.length - 1]);
  const hasData = elections.some((e) => Object.keys(e.localidades).length > 0 || e.puestos.length > 0);

  return (
    <motion.header initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }} className="relative z-30 flex min-h-[4.4rem] items-center gap-4 border-b border-border-soft/80 bg-panel/80 px-5 py-3 backdrop-blur-2xl sm:px-7">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" />
      <div className="flex min-w-0 items-center gap-3.5">
        <motion.div initial={{ scale: 0.8, rotate: -8 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.12, type: "spring", stiffness: 260, damping: 18 }} className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-gradient-to-br from-accent to-accent-ink text-on-accent shadow-dossier">
          <span className="absolute inset-0 animate-sheen bg-[conic-gradient(from_200deg,transparent_0_60%,rgba(255,255,255,.52)_75%,transparent_90%)]" />
          <Radar className="relative h-5 w-5" strokeWidth={1.8} />
        </motion.div>
        <div className="min-w-0 leading-tight">
          <div className="flex items-center gap-2">
            <h1 className="truncate font-display text-[20px] font-semibold tracking-tight sm:text-[22px]">Datos a tener en cuenta</h1>
            <span className="hidden rounded-full border border-signal/30 bg-signal/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-signal sm:inline-flex">Dossier vivo</span>
          </div>
          <p className="truncate text-[10px] font-medium uppercase tracking-[0.14em] text-muted sm:text-[11px]">Consultoría de campaña · Concejo de Bogotá</p>
        </div>
      </div>
      <div className="ml-auto flex items-center gap-2.5">
        <div className="hidden items-center gap-2 rounded-full border border-border-soft bg-panel-soft/80 px-3 py-1.5 text-[11px] text-muted md:flex">
          <span className="signal-dot h-1.5 w-1.5 rounded-full bg-signal" />
          <span>{hasData ? "Datos disponibles" : "Esperando datos"}</span>
          {active && <span className="max-w-[9rem] truncate border-l border-border-soft pl-2 font-medium text-fg">{active.name}</span>}
        </div>
        <div className="flex items-center gap-1.5 text-muted">
          <Palette className="h-3.5 w-3.5" />
          <Select value={theme} onValueChange={(v) => setTheme(v as "tokyo" | "solarized")}>
            <SelectTrigger className="h-9 w-[8.5rem] rounded-xl bg-panel-soft/70 text-[11px] sm:w-[9.5rem] sm:text-[12px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="tokyo">Tokyo Night Light</SelectItem>
              <SelectItem value="solarized">Solarized Light</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Activity className="hidden h-4 w-4 text-accent sm:block" aria-label="Sistema activo" />
      </div>
    </motion.header>
  );
}
