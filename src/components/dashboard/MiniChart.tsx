"use client";

import React, { useEffect, useRef, useState } from "react";
import { Chart } from "chart.js/auto";
import { useDashboardStore } from "@/store/useDashboardStore";
import { ranking, displayColor, displayName, displayLocalityVotes, displayPuestoVotes } from "@/lib/electoral";

export default function MiniChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const elections = useDashboardStore((s) => s.elections);
  const visible = useDashboardStore((s) => s.visible);
  const theme = useDashboardStore((s) => s.theme);
  const resultViewByElection = useDashboardStore((s) => s.resultViewByElection);
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    const id = visible[visible.length - 1];
    const e = elections.find((x) => x.id === id);
    if (!canvasRef.current) return;
    chartRef.current?.destroy();
    chartRef.current = null;
    setHasData(false);
    if (!e) return;
    const view = resultViewByElection?.[e.id] || "candidate";

    const tot: Record<string, number> = {};
    if (Object.keys(e.localidades).length) {
      Object.keys(e.localidades).forEach((key) => {
        const v = displayLocalityVotes(e, key, view);
        for (const k in v) tot[k] = (tot[k] || 0) + v[k];
      });
    } else e.puestos.forEach((p) => {
      const v = displayPuestoVotes(e, p, view);
      for (const k in v) tot[k] = (tot[k] || 0) + v[k];
    });
    const rk = ranking(tot);
    if (!rk.length) return;

    const fg = getComputedStyle(document.documentElement).getPropertyValue("--fg").trim() || "#333";
    const border = getComputedStyle(document.documentElement).getPropertyValue("--border-soft").trim() || "#ccc";
    setHasData(true);

    chartRef.current = new Chart(canvasRef.current, {
      type: "bar",
      data: {
        labels: rk.map(([c]) => displayName(e, c, view)),
        datasets: [{ data: rk.map(([, v]) => v), backgroundColor: rk.map(([c]) => displayColor(e, c, view)), borderRadius: 6, maxBarThickness: 17, barPercentage: 0.7 }],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 650, easing: "easeOutQuart" },
        plugins: { legend: { display: false }, tooltip: { displayColors: false, callbacks: { label: (ctx) => ` ${Number(ctx.raw).toLocaleString("es-CO")} votos` } } },
        scales: {
          x: { ticks: { color: fg, font: { size: 10 }, callback: (v) => Number(v).toLocaleString("es-CO") }, grid: { color: border } },
          y: { ticks: { color: fg, font: { size: 10.5 } }, grid: { display: false } },
        },
      },
    });
    return () => { chartRef.current?.destroy(); chartRef.current = null; };
  }, [elections, visible, theme, resultViewByElection]);

  return (
    <div className="relative h-[142px]" aria-label={hasData ? "Resumen de votos por candidato" : "Sin votos cargados"}>
      {!hasData && <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg border border-dashed border-border-soft bg-panel/30 px-3 text-center"><span className="font-display text-[17px] text-muted">Sin señales todavía</span><span className="mt-1 text-[10.5px] leading-snug text-faint">Importa votos para activar el gráfico.</span></div>}
      <canvas ref={canvasRef} className={hasData ? "opacity-100 transition-opacity duration-500" : "opacity-0"} />
    </div>
  );
}
