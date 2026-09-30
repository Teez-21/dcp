"use client";

import React, { useEffect, useRef } from "react";
import { Chart } from "chart.js/auto";
import { useDashboardStore } from "@/store/useDashboardStore";
import { ranking, sumVotes, colorOf, nameOf } from "@/lib/electoral";

export default function MiniChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const elections = useDashboardStore((s) => s.elections);
  const visible = useDashboardStore((s) => s.visible);
  const theme = useDashboardStore((s) => s.theme);

  useEffect(() => {
    const id = visible[visible.length - 1];
    const e = elections.find((x) => x.id === id);
    if (!canvasRef.current) return;
    chartRef.current?.destroy();
    chartRef.current = null;
    if (!e) return;

    const tot: Record<string, number> = {};
    const src = Object.keys(e.localidades).length ? Object.values(e.localidades) : e.puestos.map((p) => p.votes);
    src.forEach((v) => { for (const k in v) tot[k] = (tot[k] || 0) + v[k]; });
    const rk = ranking(tot);
    if (!rk.length) return;

    const fg = getComputedStyle(document.documentElement).getPropertyValue("--fg").trim() || "#333";
    const border = getComputedStyle(document.documentElement).getPropertyValue("--border-soft").trim() || "#ccc";

    chartRef.current = new Chart(canvasRef.current, {
      type: "bar",
      data: {
        labels: rk.map(([c]) => nameOf(e, c)),
        datasets: [{ data: rk.map(([, v]) => v), backgroundColor: rk.map(([c]) => colorOf(e, c)), borderRadius: 5, maxBarThickness: 16 }],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: fg, font: { size: 10 }, callback: (v) => Number(v).toLocaleString("es-CO") }, grid: { color: border } },
          y: { ticks: { color: fg, font: { size: 10.5 } }, grid: { display: false } },
        },
      },
    });
    return () => { chartRef.current?.destroy(); chartRef.current = null; };
  }, [elections, visible, theme]);

  return (
    <div className="h-[130px]">
      <canvas ref={canvasRef} />
    </div>
  );
}
