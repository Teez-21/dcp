"use client";

import { useMemo, useState } from "react";
import projectsData from "@/data/proyectos-acuerdo-2025-I.json";

type Slice = { label: string; value: number; color: string };

type PieProps = { title: string; subtitle: string; data: Slice[]; totalLabel: string };

const sessions: Slice[] = [
  { label: "Control Político", value: 86, color: "#c4b5fd" },
  { label: "Actividad Normativa", value: 42, color: "#e9a800" },
  { label: "Otros", value: 24, color: "#2a9d8f" },
];
const debates: Slice[] = [
  { label: "Salud", value: 6, color: "#f97316" },
  { label: "Participación ciudadana", value: 1, color: "#c4b5fd" },
  { label: "Instrumentos de planificación y gestión del suelo", value: 10, color: "#64748b" },
  { label: "Servicios públicos", value: 12, color: "#58a6d9" },
  { label: "Migración", value: 1, color: "#f472b6" },
  { label: "Medio ambiente", value: 8, color: "#84cc16" },
  { label: "Espacio público", value: 4, color: "#0e9ca8" },
  { label: "Comportamiento ciudadano y cultura", value: 1, color: "#a78bfa" },
  { label: "Empleo", value: 3, color: "#fb7185" },
  { label: "Recreación y deporte", value: 2, color: "#f59e0b" },
  { label: "Gestión pública, eficiencia y transparencia", value: 18, color: "#2a9d8f" },
  { label: "Pobreza y vulnerabilidad", value: 10, color: "#e9a800" },
  { label: "Educación", value: 3, color: "#8b5cf6" },
  { label: "Género", value: 9, color: "#c8343d" },
  { label: "Grupos poblacionales, juventud y niñez", value: 12, color: "#e9a800" },
  { label: "Finanzas y presupuesto", value: 3, color: "#14b8a6" },
  { label: "Seguridad ciudadana y convivencia", value: 20, color: "#173f73" },
  { label: "Movilidad y transporte", value: 28, color: "#2f8f46" },
];
const themes: Slice[] = [
  { label: "Grupos poblacionales, juventud y niñez", value: 20, color: "#e9a800" },
  { label: "Cultura (promoción y acceso)", value: 11, color: "#c4b5fd" },
  { label: "Salud", value: 8, color: "#f97316" },
  { label: "Gestión pública, eficiencia y transparencia", value: 8, color: "#58a6d9" },
  { label: "Movilidad y transporte", value: 7, color: "#2f8f46" },
  { label: "Seguridad ciudadana y convivencia", value: 6, color: "#c8343d" },
  { label: "Turismo y desarrollo económico", value: 6, color: "#0e9ca8" },
  { label: "Recreación y deporte", value: 5, color: "#f59e0b" },
  { label: "Medio ambiente", value: 4, color: "#84cc16" },
  { label: "Educación", value: 4, color: "#8b5cf6" },
  { label: "Empleo", value: 3, color: "#fb7185" },
  { label: "Instrumentos de planificación y gestión del suelo", value: 3, color: "#64748b" },
  { label: "Comportamiento ciudadano y cultura", value: 2, color: "#14b8a6" },
  { label: "Espacio público", value: 2, color: "#a78bfa" },
  { label: "Género", value: 1, color: "#f472b6" },
];
const populations: Slice[] = [
  { label: "NNA", value: 6, color: "#e9a800" },
  { label: "Personas mayores", value: 3, color: "#c4b5fd" },
  { label: "Personas con discapacidad", value: 2, color: "#58a6d9" },
  { label: "Personas lactantes", value: 2, color: "#f472b6" },
  { label: "Familias", value: 1, color: "#2f8f46" },
  { label: "Habitantes de calle", value: 1, color: "#64748b" },
  { label: "Personas con enfermedades huerfanas", value: 1, color: "#f97316" },
  { label: "Personas con creencias religiosas", value: 1, color: "#8b5cf6" },
  { label: "Mujeres", value: 1, color: "#c8343d" },
  { label: "Trabajadoras sexuales", value: 1, color: "#0e9ca8" },
  { label: "Comunidades étnicas", value: 1, color: "#84cc16" },
];
const semesterTiming = [
  { semester: "2023-I", start: "9:35 a. m.", quorum: "9:48 a. m.", agenda: "10:01 a. m.", duration: "2:44" },
  { semester: "2023-II", start: "9:27 a. m.", quorum: "9:38 a. m.", agenda: "9:47 a. m.", duration: "2:13" },
  { semester: "2024-I", start: "9:14 a. m.", quorum: "9:21 a. m.", agenda: "9:26 a. m.", duration: "3:28" },
  { semester: "2024-II", start: "9:11 a. m.", quorum: "9:19 a. m.", agenda: "9:23 a. m.", duration: "3:00" },
  { semester: "2025-I", start: "9:09 a. m.", quorum: "9:17 a. m.", agenda: "9:21 a. m.", duration: "2:29" },
];

function polar(cx: number, cy: number, radius: number, angle: number) {
  const radians = ((angle - 90) * Math.PI) / 180;
  return { x: cx + radius * Math.cos(radians), y: cy + radius * Math.sin(radians) };
}
function arcPath(cx: number, cy: number, radius: number, start: number, end: number) {
  const a = polar(cx, cy, radius, end);
  const b = polar(cx, cy, radius, start);
  const largeArc = end - start > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${a.x} ${a.y} A ${radius} ${radius} 0 ${largeArc} 0 ${b.x} ${b.y} Z`;
}

function PieChart({ title, subtitle, data, totalLabel }: PieProps) {
  const [active, setActive] = useState<number | null>(null);
  const total = data.reduce((sum, slice) => sum + slice.value, 0);
  let angle = 0;
  const slices = data.map((slice, index) => {
    const start = angle;
    angle += (slice.value / total) * 360;
    return { ...slice, index, start, end: angle, pct: (slice.value / total) * 100 };
  });
  const activeSlice = active === null ? null : slices[active];

  return (
    <article className="rounded-[1.5rem] border border-white/10 bg-ink-950/55 p-5 md:p-6">
      <div className="flex items-start justify-between gap-4"><div><p className="eyebrow text-signal">{subtitle}</p><h3 className="mt-2 font-display text-2xl leading-tight tracking-tight">{title}</h3></div><span className="font-mono text-xs text-mist-900">{totalLabel}</span></div>
      <div className="mt-6 grid gap-5 sm:grid-cols-[190px_1fr] sm:items-center">
        <div className="relative mx-auto h-[190px] w-[190px]">
          <svg viewBox="0 0 200 200" className="h-full w-full" role="img" aria-label={`Gráfica de torta: ${title}`}>
            {slices.map((slice) => <path key={slice.label} d={arcPath(100, 100, active === slice.index ? 86 : 80, slice.start, slice.end)} fill={slice.color} fillOpacity={active === null || active === slice.index ? 0.94 : 0.25} stroke="#0b1020" strokeWidth="2" onMouseEnter={() => setActive(slice.index)} onMouseLeave={() => setActive(null)} onFocus={() => setActive(slice.index)} tabIndex={0} role="button" aria-label={`${slice.label}: ${slice.value}`} />)}
            <circle cx="100" cy="100" r="39" fill="#0b1020" stroke="rgba(255,255,255,.12)" />
            <text x="100" y="96" textAnchor="middle" fill="#f5f7fb" fontSize="17" fontWeight="600">{activeSlice ? activeSlice.value : total}</text>
            <text x="100" y="113" textAnchor="middle" fill="#8f9ab0" fontSize="8" letterSpacing="1">{activeSlice ? "%" + Math.round(activeSlice.pct) : "TOTAL"}</text>
          </svg>
          {activeSlice && <div className="pointer-events-none absolute left-1/2 top-0 z-10 w-44 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-white/15 bg-ink-950/95 p-2 text-center text-[11px] shadow-xl"><strong className="block text-mist-100">{activeSlice.label}</strong><span className="text-signal">{activeSlice.value} · {activeSlice.pct.toFixed(2)}%</span></div>}
        </div>
        <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1 [scrollbar-width:thin]">
          {slices.map((slice) => <button key={slice.label} type="button" onMouseEnter={() => setActive(slice.index)} onMouseLeave={() => setActive(null)} onFocus={() => setActive(slice.index)} onBlur={() => setActive(null)} className={`flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-left transition-colors ${active === slice.index ? "bg-white/[.08]" : "hover:bg-white/[.04]"}`}><span className="flex min-w-0 items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: slice.color }} /><span className="text-xs leading-snug text-mist-900">{slice.label}</span></span><span className="shrink-0 font-mono text-[10px] text-mist-100">{slice.value}</span></button>)}
        </div>
      </div>
    </article>
  );
}

function timeMinutes(value: string) {
  const match = value.match(/(\d+):(\d+)/);
  if (!match) return 0;
  let hour = Number(match[1]);
  if (hour < 8) hour += 12;
  return hour * 60 + Number(match[2]);
}

function TimingBarChart() {
  const series = [
    { key: "start", label: "Hora inicio", color: "#2d6f8c" },
    { key: "quorum", label: "Conformación de quórum", color: "#c967c8" },
    { key: "agenda", label: "Aprobación del orden del día", color: "#28733d" },
  ] as const;
  const min = 525;
  const max = 625;
  const y = (minutes: number) => 260 - ((minutes - min) / (max - min)) * 205;
  const ticks = [530, 550, 570, 590, 610, 625];
  const tickLabel = (minutes: number) => `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
  return <article className="rounded-[1.5rem] border border-white/10 bg-ink-950/55 p-5 md:p-6"><div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="eyebrow text-signal">Lectura histórica</p><h3 className="mt-2 font-display text-2xl leading-tight tracking-tight">Hora promedio de las sesiones</h3><p className="mt-2 max-w-2xl text-sm leading-relaxed text-mist-900">Comparación semestral de la hora de inicio, la conformación del quórum y la aprobación del orden del día.</p></div><span className="font-mono text-xs text-mist-900">2023-I → 2025-I</span></div><div className="mt-6 overflow-x-auto"><svg viewBox="0 0 820 325" className="min-w-[680px]" role="img" aria-label="Gráfico de barras con los horarios promedio del Concejo por semestre"><rect x="60" y="35" width="735" height="225" rx="12" fill="#0b1020" />{ticks.map((tick) => <g key={tick}><line x1="60" x2="795" y1={y(tick)} y2={y(tick)} stroke="rgba(255,255,255,.12)" /><text x="50" y={y(tick) + 4} textAnchor="end" fill="#8f9ab0" fontSize="11">{tickLabel(tick)}</text></g>)}{semesterTiming.map((row, index) => { const center = 135 + index * 160; return <g key={row.semester}><rect x={center - 28} y={y(timeMinutes(row.start))} width="28" height={260 - y(timeMinutes(row.start))} fill="#2d6f8c" rx="3" /><rect x={center} y={y(timeMinutes(row.quorum))} width="28" height={260 - y(timeMinutes(row.quorum))} fill="#c967c8" rx="3" /><circle cx={center + 68} cy={y(timeMinutes(row.agenda))} r="5" fill="#28733d" /><text x={center + 68} y={y(timeMinutes(row.agenda)) - 10} textAnchor="middle" fill="#f5f7fb" fontSize="11">{row.agenda}</text><text x={center + 14} y="286" textAnchor="middle" fill="#8f9ab0" fontSize="11">{row.semester}</text></g>; })}<polyline points={semesterTiming.map((row, index) => `${135 + index * 160 + 68},${y(timeMinutes(row.agenda))}`).join(" ")} fill="none" stroke="#28733d" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" /><line x1="60" x2="795" y1="260" y2="260" stroke="rgba(255,255,255,.24)" /></svg></div><div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[10px] uppercase tracking-[.12em] text-mist-900">{series.map((item) => <span key={item.key} className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: item.color }} />{item.label}</span>)}</div><div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">{semesterTiming.map((row) => <div key={row.semester} className="rounded-lg border border-white/10 bg-white/[.025] p-2"><p className="font-mono text-[10px] text-signal">{row.semester}</p><p className="mt-1 text-[10px] text-mist-900">Duración <span className="text-mist-100">{row.duration}</span></p></div>)}</div></article>;
}

export default function CouncilOverviewSection() {
  const [showProjects, setShowProjects] = useState(false);
  const projects = projectsData.projects;
  return (
    <div className="mt-10 space-y-5">
      <div className="rounded-[1.5rem] border border-white/10 bg-ink-950/40 p-5 md:p-7"><p className="eyebrow text-signal">Concejo de Bogotá · primer semestre de 2025</p><h3 className="mt-2 font-display text-3xl tracking-tight md:text-4xl">Qué se discutió y a quiénes estuvo dirigido.</h3><p className="mt-3 max-w-3xl text-sm leading-relaxed text-mist-900">Tres lecturas rápidas sobre las sesiones, los temas priorizados por la ciudadanía y los proyectos de acuerdo con enfoque poblacional en el semestre 2025-I (referencia).</p></div>
      <PieChart title="Distribución de sesiones" subtitle="Actividad del Concejo" totalLabel="152 sesiones" data={sessions} />
      <PieChart title="Temas de los debates de control político" subtitle="Argumentación 30% · 2025-I" totalLabel="151 debates" data={debates} />
      <TimingBarChart />
      <div className="grid gap-5 xl:grid-cols-2"><PieChart title="Temas priorizados por la ciudadanía" subtitle="Agenda temática · 2025-I" totalLabel="90 menciones" data={themes} /><PieChart title="Proyectos de acuerdo por grupo poblacional" subtitle="Enfoque poblacional · 2025-I" totalLabel="20 acuerdos" data={populations} /></div>
      <div className="rounded-[1.5rem] border border-white/10 bg-ink-950/55 p-5 md:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="eyebrow text-signal">Proyectos de acuerdo</p><h3 className="mt-2 font-display text-2xl tracking-tight">Todos los PA del semestre</h3><p className="mt-2 text-sm text-mist-900">Listado transcrito del archivo adjunto: {projects.length} registros.</p></div><button type="button" className="magnetic-button magnetic-button-primary shrink-0 justify-center" onClick={() => setShowProjects((value) => !value)}>{showProjects ? "Ocultar proyectos" : "Ver todos los PA"}</button></div>{showProjects && <div className="mt-6 max-h-[34rem] space-y-2 overflow-y-auto border-t border-white/10 pt-5 [scrollbar-width:thin]">{projects.map((project, index) => <article key={`${project.number}-${index}`} className="rounded-xl border border-white/10 bg-white/[.025] p-3"><div className="flex items-start gap-3"><span className="min-w-[8rem] font-mono text-[10px] uppercase tracking-wider text-signal">{project.number}</span><p className="text-sm leading-relaxed text-mist-100">{project.title}</p></div></article>)}</div>}</div>
    </div>
  );
}
