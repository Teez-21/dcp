"use client";

import { useMemo, useState } from "react";
import councillorData from "@/data/concejales-2023.json";

type Councillor = { id: string; name: string; party: string; votes: number | null; color: string };
type Point = { councillor: Councillor; x: number; y: number; angle: number; displayParty: string; color: string; radius: number };
type Hovered = Point;

const councillors = councillorData.councillors as Councillor[];
const fmtVotes = (votes: number | null) => votes === null ? "Dato no disponible" : `${votes.toLocaleString("es-CO")} votos`;

const VISUAL_PARTY = {
  "Polo Democrático": "Polo Democrático / Colombia Humana",
  "Colombia Humana": "Polo Democrático / Colombia Humana",
  "MAIS": "MAIS / Unión Patriótica",
  "Unión Patriotica": "MAIS / Unión Patriótica",
} as const;
const PARTY_COLORS: Record<string, string> = {
  "Polo Democrático / Colombia Humana": "#e9a800",
  "MAIS / Unión Patriótica": "#f4c95d",
  "Nuevo Liberalismo": "#c8343d",
  "En Marcha": "#c8343d",
  "Alianza Verde": "#2f8f46",
  "Partido Liberal": "#7b2cbf",
  "MIRA": "#58a6d9",
  "Centro Democrático": "#173f73",
  "Justas libres": "#d41475",
  "Colombia Renaciente": "#14b8a6",
  "Cambio Radical": "#ec6aa6",
  "Con Toda Por Bogotá": "#0e9ca8",
  "Nueva Fuerza Demócratica": "#64748b",
  "Partido Ecologista Colombiano": "#84cc16",
  "Partido de la U": "#f97316",
};
const PARTY_ORDER = [
  "Polo Democrático / Colombia Humana",
  "MAIS / Unión Patriótica",
  "Nuevo Liberalismo",
  "En Marcha",
  "Alianza Verde",
  "Partido Liberal",
  "MIRA",
  "Centro Democrático",
  "Justas libres",
  "Colombia Renaciente",
  "Cambio Radical",
  "Con Toda Por Bogotá",
  "Nueva Fuerza Demócratica",
  "Partido Ecologista Colombiano",
  "Partido de la U",
];
const RINGS = [5, 8, 10, 10, 12];
const RADII = [58, 99, 140, 181, 222];

function visualParty(party: string) {
  return VISUAL_PARTY[party as keyof typeof VISUAL_PARTY] ?? party;
}
function pointPosition(index: number) {
  let remaining = index;
  let ring = 0;
  while (remaining >= RINGS[ring] && ring < RINGS.length - 1) {
    remaining -= RINGS[ring];
    ring += 1;
  }
  const count = RINGS[ring];
  const angle = 180 - (remaining / Math.max(1, count - 1)) * 180;
  const radians = (angle * Math.PI) / 180;
  return { x: 460 + RADII[ring] * Math.cos(radians), y: 292 - RADII[ring] * Math.sin(radians), angle };
}

export default function CouncilDataSection() {
  const [hovered, setHovered] = useState<Hovered | null>(null);
  const [selectedParty, setSelectedParty] = useState<string | null>(null);
  const partyCounts = useMemo(() => {
    const counts = new Map<string, number>();
    councillors.forEach((councillor) => counts.set(visualParty(councillor.party), (counts.get(visualParty(councillor.party)) ?? 0) + 1));
    return counts;
  }, []);
  const parties = useMemo(() => PARTY_ORDER.filter((party) => partyCounts.has(party)), [partyCounts]);
  const points = useMemo(() => {
    const order = new Map(PARTY_ORDER.map((party, index) => [party, index]));
    const sorted = [...councillors].sort((a, b) => (order.get(visualParty(a.party)) ?? 99) - (order.get(visualParty(b.party)) ?? 99) || a.name.localeCompare(b.name, "es"));
    return sorted.map((councillor, index) => {
      const displayParty = visualParty(councillor.party);
      const position = pointPosition(index);
      return { councillor, ...position, displayParty, color: PARTY_COLORS[displayParty] ?? councillor.color, radius: councillor.party === "En Marcha" ? 10.5 : 8.5 };
    });
  }, []);
  const knownVotes = councillors.filter((councillor) => councillor.votes !== null);
  const totalVotes = knownVotes.reduce((sum, councillor) => sum + (councillor.votes ?? 0), 0);
  const missingVotes = councillors.length - knownVotes.length;
  const showPoint = (point: Point) => setHovered(point);

  return <div className="mt-14 overflow-hidden rounded-[2rem] border border-white/10 bg-ink-950/60 p-5 shadow-2xl shadow-black/20 md:p-8">
    <style jsx>{`@keyframes council-glitch { 0%,100% { transform: translate(0,0); } 20% { transform: translate(-2px,1px); } 40% { transform: translate(2px,-1px); } 60% { transform: translate(-1px,-2px); } 80% { transform: translate(2px,2px); } } .council-point-glitch { animation: council-glitch .42s steps(2,end) infinite; transform-box: fill-box; transform-origin: center; }`}</style>
    <div className="flex flex-col gap-5 border-b border-white/10 pb-6 lg:flex-row lg:items-end lg:justify-between"><div className="max-w-2xl"><p className="eyebrow text-signal">45 curules · {parties.length} bloques visuales</p><h3 className="mt-3 font-display text-3xl font-semibold tracking-[-.04em] md:text-5xl">Una cámara de nombres.</h3><p className="mt-4 text-sm leading-relaxed text-mist-900">Cada punto es una curul. Los partidos ocupan cuñas radiales continuas, ordenadas de izquierda a derecha; al tocar un punto comienza un pequeño efecto glitch y aparece su información.</p></div><div className="grid grid-cols-2 gap-2 text-right text-[10px] uppercase tracking-[.16em] text-mist-900"><div className="rounded-xl border border-white/10 bg-white/[.03] px-3 py-2"><span className="block font-mono text-lg tracking-normal text-mist-100">{knownVotes.length}</span>con votos</div><div className="rounded-xl border border-white/10 bg-white/[.03] px-3 py-2"><span className="block font-mono text-lg tracking-normal text-mist-100">{totalVotes.toLocaleString("es-CO")}</span>votos conocidos</div></div></div>

    <div className="relative mt-7 overflow-x-auto rounded-2xl border border-white/10 bg-[#0b1020] p-3 md:p-5"><div className="min-w-[720px]"><svg viewBox="0 0 920 370" className="h-auto w-full" role="img" aria-label="Gráfico parlamentario de 45 curules agrupadas por partido en hemiciclo"><defs><radialGradient id="council-glow" cx="50%" cy="55%" r="62%"><stop offset="0%" stopColor="#c4b5fd" stopOpacity=".12" /><stop offset="100%" stopColor="#c4b5fd" stopOpacity="0" /></radialGradient></defs><rect width="920" height="370" fill="url(#council-glow)" rx="18" /><path d="M238 292 A222 222 0 0 1 682 292" fill="none" stroke="#c4b5fd" strokeOpacity=".14" strokeWidth="1" strokeDasharray="4 8" />{points.map((point) => { const active = !selectedParty || selectedParty === point.displayParty; const glitch = hovered?.councillor.id === point.councillor.id; return <g key={point.councillor.id} tabIndex={0} role="button" aria-label={`${point.councillor.name}, ${point.displayParty}`} opacity={active ? 1 : .16} className={glitch ? "council-point-glitch" : ""} onMouseEnter={() => showPoint(point)} onMouseLeave={() => setHovered(null)} onTouchStart={() => showPoint(point)} onFocus={() => showPoint(point)} onBlur={() => setHovered(null)}><circle cx={point.x} cy={point.y} r={point.radius + 6} fill={point.color} fillOpacity=".14" /><circle cx={point.x} cy={point.y} r={point.radius} fill={point.color} stroke="rgba(255,255,255,.34)" strokeWidth="1.5" /></g>; })}<text x="460" y="350" textAnchor="middle" fill="#8f9ab0" fontSize="11" letterSpacing="2">CONCEJO DE BOGOTÁ · PERÍODO 2023—2027</text></svg>{hovered && <div className={`pointer-events-none absolute z-20 w-56 -translate-x-1/2 rounded-xl border border-white/15 bg-ink-950/95 p-3 shadow-xl backdrop-blur ${hovered.y < 95 ? "translate-y-2" : "-translate-y-full"}`} style={{ left: `${(hovered.x / 920) * 100}%`, top: `${(hovered.y / 370) * 100}%` }}><p className="text-sm font-semibold leading-tight text-mist-100">{hovered.councillor.name}</p><p className="mt-1 text-xs text-signal">{hovered.displayParty}</p><p className="mt-2 font-mono text-[11px] text-mist-900">{fmtVotes(hovered.councillor.votes)}</p></div>}</div></div>

    <div className="mt-6 flex flex-wrap gap-2" aria-label="Filtrar por bancada"><button type="button" onClick={() => setSelectedParty(null)} className={`rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-[.13em] transition-colors ${!selectedParty ? "border-signal bg-signal text-ink-950" : "border-white/10 text-mist-900 hover:border-signal/60"}`}>Todas</button>{parties.map((party) => { const color = PARTY_COLORS[party]; return <button key={party} type="button" onClick={() => setSelectedParty(selectedParty === party ? null : party)} className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-[.13em] transition-colors ${selectedParty === party ? "border-signal bg-white/10 text-mist-100" : "border-white/10 text-mist-900 hover:border-signal/60"}`}><span className="h-2 w-2 rounded-full" style={{ background: color }} />{party}</button>; })}</div>
    <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{parties.map((party) => <button key={party} type="button" onClick={() => setSelectedParty(selectedParty === party ? null : party)} className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition-colors ${selectedParty === party ? "border-signal/70 bg-white/[.08]" : "border-white/10 bg-white/[.025] hover:bg-white/[.06]"}`}><span className="flex min-w-0 items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: PARTY_COLORS[party] }} /><span className="truncate text-xs text-mist-100">{party}</span></span><span className="font-mono text-[10px] text-mist-900">{partyCounts.get(party)}</span></button>)}</div>
    <p className="mt-5 text-[11px] leading-relaxed text-mist-900">Polo Democrático y Colombia Humana se muestran como un bloque visual; MAIS y Unión Patriótica como otro. En Marcha conserva su nombre, comparte color con Nuevo Liberalismo y sus puntos son ligeramente más grandes. Fuente de votos: datos precargados de Concejo de Bogotá 2023—2027. {missingVotes ? `${missingVotes} nombres no tienen un total individual coincidente en la fuente disponible y muestran “Dato no disponible”.` : "Todos los nombres tienen total individual disponible."}</p>
  </div>;
}
