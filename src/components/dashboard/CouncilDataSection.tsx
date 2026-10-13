"use client";

import { useMemo, useState } from "react";
import councillorData from "@/data/concejales-2023.json";

type Councillor = {
  id: string;
  name: string;
  party: string;
  votes: number | null;
  color: string;
};

type Hovered = Councillor & { x: number; y: number };

const councillors = councillorData.councillors as Councillor[];
const partyColors = councillorData.partyColors as Record<string, string>;
const fmtVotes = (votes: number | null) => votes === null ? "Dato no disponible" : `${votes.toLocaleString("es-CO")} votos`;
const shortName = (name: string) => {
  const parts = name.trim().split(/\s+/);
  return parts.length > 2 ? `${parts[0]} ${parts[parts.length - 2]} ${parts[parts.length - 1]}` : name;
};

function pointPosition(index: number) {
  const columns = 9;
  const row = Math.floor(index / columns);
  const column = index % columns;
  const rowCount = Math.min(columns, councillors.length - row * columns);
  const rowWidth = (rowCount - 1) * 82;
  const x = 460 - rowWidth / 2 + column * 82;
  const y = 58 + row * 58 + Math.abs(4 - column) * 5;
  return { x, y };
}

export default function CouncilDataSection() {
  const [hovered, setHovered] = useState<Hovered | null>(null);
  const [selectedParty, setSelectedParty] = useState<string | null>(null);
  const points = useMemo(() => councillors.map((councillor, index) => ({ councillor, ...pointPosition(index) })), []);
  const parties = useMemo(() => Object.entries(partyColors).filter(([party]) => councillors.some((councillor) => councillor.party === party)), []);
  const knownVotes = councillors.filter((councillor) => councillor.votes !== null);
  const totalVotes = knownVotes.reduce((sum, councillor) => sum + (councillor.votes ?? 0), 0);
  const missingVotes = councillors.length - knownVotes.length;

  return (
    <div className="mt-14 overflow-hidden rounded-[2rem] border border-white/10 bg-ink-950/60 p-5 shadow-2xl shadow-black/20 md:p-8">
      <div className="flex flex-col gap-5 border-b border-white/10 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="eyebrow text-signal">45 puntos · 17 bancadas</p>
          <h3 className="mt-3 font-display text-3xl font-semibold tracking-[-.04em] md:text-5xl">Una cámara de nombres.</h3>
          <p className="mt-4 text-sm leading-relaxed text-mist-900">Cada punto representa un concejal o concejala. Pasa el cursor —o enfoca con teclado— para consultar su bancada y los votos registrados.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-right text-[10px] uppercase tracking-[.16em] text-mist-900">
          <div className="rounded-xl border border-white/10 bg-white/[.03] px-3 py-2"><span className="block font-mono text-lg tracking-normal text-mist-100">{knownVotes.length}</span>con votos</div>
          <div className="rounded-xl border border-white/10 bg-white/[.03] px-3 py-2"><span className="block font-mono text-lg tracking-normal text-mist-100">{totalVotes.toLocaleString("es-CO")}</span>votos conocidos</div>
        </div>
      </div>

      <div className="relative mt-7 overflow-x-auto rounded-2xl border border-white/10 bg-[#0b1020] p-3 md:p-5">
        <div className="min-w-[720px]">
          <svg viewBox="0 0 920 370" className="h-auto w-full" role="img" aria-label="Gráfico interactivo de concejales por bancada">
            <defs>
              <radialGradient id="council-glow" cx="50%" cy="42%" r="62%"><stop offset="0%" stopColor="#c4b5fd" stopOpacity=".12" /><stop offset="100%" stopColor="#c4b5fd" stopOpacity="0" /></radialGradient>
            </defs>
            <rect width="920" height="370" fill="url(#council-glow)" rx="18" />
            <path d="M110 318 Q460 8 810 318" fill="none" stroke="#c4b5fd" strokeOpacity=".11" strokeWidth="1" strokeDasharray="4 8" />
            {points.map(({ councillor, x, y }) => {
              const active = !selectedParty || selectedParty === councillor.party;
              return (
                <g key={councillor.id} tabIndex={0} role="button" aria-label={`${councillor.name}, ${councillor.party}`} opacity={active ? 1 : .16} onMouseEnter={() => setHovered({ ...councillor, x, y })} onMouseLeave={() => setHovered(null)} onFocus={() => setHovered({ ...councillor, x, y })} onBlur={() => setHovered(null)}>
                  <circle cx={x} cy={y} r="15" fill={councillor.color} fillOpacity=".16" />
                  <circle cx={x} cy={y} r="8.5" fill={councillor.color} stroke={councillor.party === "Partido Conservador" ? "#64748b" : "rgba(255,255,255,.32)"} strokeWidth="1.5" className="transition-all duration-200 hover:scale-125" />
                </g>
              );
            })}
            <text x="460" y="350" textAnchor="middle" fill="#8f9ab0" fontSize="11" letterSpacing="2">CONCEJO DE BOGOTÁ · PERÍODO 2023—2027</text>
          </svg>
          {hovered && <div className={`pointer-events-none absolute z-20 w-56 -translate-x-1/2 rounded-xl border border-white/15 bg-ink-950/95 p-3 shadow-xl backdrop-blur ${hovered.y < 105 ? "translate-y-2" : "-translate-y-full"}`} style={{ left: `${(hovered.x / 920) * 100}%`, top: `${(hovered.y / 370) * 100}%` }}><p className="text-sm font-semibold leading-tight text-mist-100">{hovered.name}</p><p className="mt-1 text-xs text-signal">{hovered.party}</p><p className="mt-2 font-mono text-[11px] text-mist-900">{fmtVotes(hovered.votes)}</p></div>}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2" aria-label="Filtrar por bancada">
        <button type="button" onClick={() => setSelectedParty(null)} className={`rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-[.13em] transition-colors ${!selectedParty ? "border-signal bg-signal text-ink-950" : "border-white/10 text-mist-900 hover:border-signal/60"}`}>Todas</button>
        {parties.map(([party, color]) => <button key={party} type="button" onClick={() => setSelectedParty(selectedParty === party ? null : party)} className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-[.13em] transition-colors ${selectedParty === party ? "border-signal bg-white/10 text-mist-100" : "border-white/10 text-mist-900 hover:border-signal/60"}`}><span className="h-2 w-2 rounded-full" style={{ background: color, border: party === "Partido Conservador" ? "1px solid #64748b" : undefined }} />{party}</button>)}
      </div>

      <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {parties.map(([party, color]) => <button key={party} type="button" onClick={() => setSelectedParty(selectedParty === party ? null : party)} className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition-colors ${selectedParty === party ? "border-signal/70 bg-white/[.08]" : "border-white/10 bg-white/[.025] hover:bg-white/[.06]"}`}><span className="flex min-w-0 items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color, border: party === "Partido Conservador" ? "1px solid #64748b" : undefined }} /><span className="truncate text-xs text-mist-100">{party}</span></span><span className="font-mono text-[10px] text-mist-900">{councillors.filter((councillor) => councillor.party === party).length}</span></button>)}
      </div>
      <p className="mt-5 text-[11px] leading-relaxed text-mist-900">Fuente de votos: datos precargados de Concejo de Bogotá 2023—2027. {missingVotes ? `${missingVotes} nombres de la lista no tienen un total individual coincidente en la fuente disponible; aparecen en el gráfico, pero muestran “Dato no disponible”.` : "Todos los nombres tienen total individual disponible."}</p>
    </div>
  );
}
