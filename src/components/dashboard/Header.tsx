"use client";

import React from "react";
import { motion } from "framer-motion";
import { useDashboardStore } from "@/store/useDashboardStore";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Palette } from "lucide-react";

export default function Header() {
  const theme = useDashboardStore((s) => s.theme);
  const setTheme = useDashboardStore((s) => s.setTheme);

  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative z-30 flex items-center gap-4 border-b border-border-soft bg-panel/85 px-6 py-3 backdrop-blur-xl"
    >
      <div className="flex items-center gap-3">
        <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-accent to-accent2 shadow-dossier">
          <span className="absolute inset-0 animate-sheen bg-[conic-gradient(from_200deg,transparent_0_60%,rgba(255,255,255,.55)_75%,transparent_90%)]" />
        </span>
        <div className="leading-tight">
          <h1 className="font-display text-[21px] font-semibold tracking-tight">Datos a tener en cuenta</h1>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted">Consultoría de campaña · Concejo de Bogotá</p>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2 text-[12.5px] text-muted">
        <Palette className="h-3.5 w-3.5" />
        <Select value={theme} onValueChange={(v) => setTheme(v as "tokyo" | "solarized")}>
          <SelectTrigger className="w-[9.5rem]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="tokyo">Tokyo Night Light</SelectItem>
            <SelectItem value="solarized">Solarized Light</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </motion.header>
  );
}
