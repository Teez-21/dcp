"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { TrendingUp, GitCompareArrows, Users, BarChart3, Radio, NotebookText } from "lucide-react";
import Header from "./Header";
import NavTabs, { ModuleId } from "./NavTabs";
import ThemeSync from "./ThemeSync";
import ControlDeck from "./ControlDeck";
import PlaceholderModule from "./PlaceholderModule";

const MapCanvas = dynamic(() => import("./MapCanvas"), { ssr: false });

const PLACEHOLDERS: Record<Exclude<ModuleId, "mapa">, { icon: any; title: string; text: string }> = {
  intencion: { icon: TrendingUp, title: "Intención de voto y pertenencia partidista", text: "Módulo pendiente. Lo construimos cuando entregues los datos de las encuestas." },
  espectro: { icon: GitCompareArrows, title: "Espectro del voto", text: "Módulo pendiente. Alcaldía, Concejo, Cámara y presidenciales, lado a lado." },
  personajes: { icon: Users, title: "Personajes importantes", text: "Módulo pendiente." },
  temas: { icon: BarChart3, title: "Temas más importantes para la ciudadanía", text: "Módulo pendiente. Se podrá comparar con el módulo de temas del candidato." },
  candidato: { icon: Radio, title: "Temas del candidato y reacciones en redes", text: "Módulo pendiente." },
  notas: { icon: NotebookText, title: "Notas", text: "Módulo pendiente." },
};

export default function Dashboard() {
  const [active, setActive] = useState<ModuleId>("mapa");

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <ThemeSync />
      <Header />
      <NavTabs active={active} onChange={setActive} />

      <main className="relative min-h-0 flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="absolute inset-0"
          >
            {active === "mapa" ? (
              <div className="relative h-full w-full">
                <MapCanvas />
                <div className="pointer-events-none absolute inset-0">
                  <ControlDeck />
                </div>
              </div>
            ) : (
              <PlaceholderModule {...PLACEHOLDERS[active]} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
