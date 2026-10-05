"use client";

import React, { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronsUpDown, Landmark, MapPinned, CircleDot, Layers,
  Upload, FileJson, FolderOpen, Plus, X, ChartColumnBig,
} from "lucide-react";
import { useDashboardStore } from "@/store/useDashboardStore";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Slider } from "@/components/ui/slider";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { displayColor, displayPuestoVotes, sumVotes } from "@/lib/electoral";
import { pollingStationSummary, stationForPuesto } from "@/lib/pollingStations";
import MiniChart from "./MiniChart";

const MODES = [
  { value: "winner", label: "Ganador", desc: "Color del candidato o partido más votado en cada zona", icon: Landmark },
  { value: "split", label: "Proporción", desc: "Reparte el color según la participación de cada candidatura", icon: Layers },
] as const;

const TERRITORY_LEVELS = [
  { value: "localidades", label: "Localidad", icon: Landmark },
  { value: "upz", label: "UPZ", icon: Layers },
  { value: "puestos", label: "Puesto", icon: CircleDot },
] as const;

function download(name: string, text: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export default function ControlDeck() {
  const [collapsed, setCollapsed] = useState(false);
  const s = useDashboardStore();
  const editingE = s.elections.find((e) => e.id === s.editing) ?? s.elections[0];
  const [msg, setMsg] = useState<string | null>(null);

  const fReg = useRef<HTMLInputElement>(null);
  const fCoord = useRef<HTMLInputElement>(null);
  const fLoc = useRef<HTMLInputElement>(null);
  const fPue = useRef<HTMLInputElement>(null);
  const fProj = useRef<HTMLInputElement>(null);
  const [newCand, setNewCand] = useState("");
  const [newElec, setNewElec] = useState("");
  const resultView = editingE ? (s.resultViewByElection?.[editingE.id] || "candidate") : "candidate";
  const parties = useMemo(() => {
    if (!editingE?.partyMode) return [];
    return Array.from(new Set(editingE.candidates.map((c) => c.party).filter(Boolean))) as string[];
  }, [editingE]);
  const outsideUpzPostCount = useMemo(() => {
    const stationKeys = new Set<string>();
    s.elections.filter((e) => s.visible.includes(e.id)).forEach((e) => {
      const view = s.resultViewByElection?.[e.id] || "candidate";
      e.puestos.forEach((puesto) => {
        const station = stationForPuesto(puesto);
        if (station && !station.upz_code && sumVotes(displayPuestoVotes(e, puesto, view)) > 0) stationKeys.add(station.station_key);
      });
    });
    return stationKeys.size;
  }, [s.elections, s.visible, s.resultViewByElection]);

  function withFile(input: React.RefObject<HTMLInputElement>, cb: (text: string) => void) {
    const f = input.current?.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try { cb(String(r.result)); }
      catch (err: any) { setMsg("Error: " + (err?.message || "no se pudo leer el archivo")); }
      if (input.current) input.current.value = "";
    };
    r.readAsText(f, "utf-8");
  }

  return (
    <motion.aside
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="glass-panel pointer-events-auto absolute left-4 top-4 z-[600] flex max-h-[calc(100%-2rem)] w-[23rem] flex-col overflow-hidden rounded-2xl max-md:bottom-3 max-md:left-3 max-md:right-3 max-md:top-auto max-md:w-auto max-md:max-h-[58vh]"
    >
      {/* Cabecera del panel */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="group flex items-center gap-2.5 border-b border-border-soft px-4 py-3.5 text-left transition-colors hover:bg-panel-2/60"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-accent-ink text-on-accent">
          <MapPinned className="h-4 w-4" />
        </span>
        <span className="flex-1">
          <span className="block font-display text-[15px] font-semibold leading-tight">Mapa electoral</span>
          <span className="block text-[11px] text-muted">{s.visible.length} votación{s.visible.length === 1 ? "" : "es"} activa{s.visible.length === 1 ? "" : "s"}</span>
        </span>
        <ChevronsUpDown className={"h-4 w-4 text-muted transition-transform " + (collapsed ? "rotate-180" : "")} />
      </button>

      {!collapsed && (
        <div className="flex flex-col gap-3 overflow-y-auto p-3.5 [scrollbar-width:thin]">
          {/* Elecciones visibles: escondidas en un desplegable */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="default" className="w-full justify-between">
                <span className="flex items-center gap-2"><Landmark className="h-3.5 w-3.5 text-accent" />Elecciones</span>
                <span className="text-muted">{s.visible.length}/{s.elections.length}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[20rem]">
              <DropdownMenuLabel>Marca las que quieres ver en el mapa</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {s.elections.map((e) => (
                <DropdownMenuCheckboxItem
                  key={e.id}
                  checked={s.visible.includes(e.id)}
                  onSelect={(ev) => ev.preventDefault()}
                  onCheckedChange={() => s.toggleVisible(e.id)}
                >
                  <span className="flex-1">{e.name}</span>
                  <span className="flex gap-1">
                    {e.candidates.slice(0, 4).map((c) => (
                      <span key={c.id} className="h-2 w-2 rounded-full" style={{ background: c.color }} />
                    ))}
                  </span>
                </DropdownMenuCheckboxItem>
              ))}
              <DropdownMenuSeparator />
              <p className="px-3 pb-1.5 pt-1 text-[11px] leading-snug text-muted">
                Las votaciones seleccionadas se dibujan como capas translúcidas; al superponerse, sus colores se mezclan.
              </p>
            </DropdownMenuContent>
          </DropdownMenu>

          <div>
            <p className="mb-1.5 px-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-muted">Unidad territorial</p>
            <ToggleGroup
              type="single"
              value={s.territoryLevel}
              onValueChange={(value) => value && s.setTerritoryLevel(value as typeof s.territoryLevel)}
              className="grid grid-cols-3"
              aria-label="Cambiar entre localidad, UPZ y puesto de votación"
            >
              {TERRITORY_LEVELS.map((level) => (
                <ToggleGroupItem key={level.value} value={level.value} className="justify-center gap-1 text-center text-[11.5px]">
                  <level.icon className="h-3.5 w-3.5 shrink-0 text-accent" />{level.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            {s.territoryLevel === "upz" && (
              <p role="status" className="mt-1.5 rounded-lg border border-accent/25 bg-accent/5 px-2.5 py-2 text-[10.5px] leading-snug text-muted">
                Los votos se suman desde sus puestos. {pollingStationSummary.upz_without_stations} UPZ sin puestos aparecen en gris; {outsideUpzPostCount} puestos con votos fuera de estos polígonos no se asignan a una UPZ.
              </p>
            )}
          </div>

          {/* Modo de resultado y margen de los círculos */}
          <div>
            {s.territoryLevel === "puestos" ? (
              <>
                <p className="mb-1.5 px-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-muted">El tamaño del círculo indica la diferencia</p>
                <ToggleGroup type="single" value={s.marginMetric} onValueChange={(v) => v && s.setMarginMetric(v as typeof s.marginMetric)} className="grid grid-cols-2">
                  <ToggleGroupItem value="absolute" className="justify-center text-[12px]">Votos de diferencia</ToggleGroupItem>
                  <ToggleGroupItem value="percentage" className="justify-center text-[12px]">Diferencia porcentual</ToggleGroupItem>
                </ToggleGroup>
                <p className="mt-1.5 px-0.5 text-[10.5px] leading-snug text-muted">
                  Entre el primer y segundo lugar; el porcentaje se calcula sobre los votos de candidatos o partidos.
                </p>
              </>
            ) : (
              <>
                <p className="mb-1.5 px-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-muted">Resultado por {s.territoryLevel === "localidades" ? "localidad" : "UPZ"}</p>
                <ToggleGroup type="single" value={s.mode} onValueChange={(v) => v && s.setMode(v as typeof s.mode)} className="grid grid-cols-2">
                  {MODES.map((m) => (
                    <ToggleGroupItem key={m.value} value={m.value} className="justify-center text-[12px]">
                      <m.icon className="h-3.5 w-3.5 text-accent" />{m.label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
                <p className="mt-1.5 px-0.5 text-[10.5px] leading-snug text-muted">{MODES.find((m) => m.value === s.mode)?.desc}</p>
              </>
            )}
            <div className="mt-2.5 flex items-center gap-3 px-0.5">
              <span className="whitespace-nowrap text-[11.5px] text-muted">Transparencia</span>
              <Slider min={0.1} max={1} step={0.05} value={[s.opacity]} onValueChange={([v]) => s.setOpacity(v)} aria-label="Transparencia de las capas de elecciones" />
              <span className="w-9 text-right font-mono text-[11px] text-muted">{Math.round(s.opacity * 100)}%</span>
            </div>
          </div>

          {/* Mini gráfico resumen */}
          <div className="rounded-xl border border-border-soft bg-panel-soft p-3">
            <p className="mb-1.5 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-muted">
              <ChartColumnBig className="h-3 w-3" /> Resumen de votos
            </p>
            <MiniChart />
          </div>

          {/* Votación a editar */}
          <div className="flex items-center gap-2">
            <span className="whitespace-nowrap text-[11.5px] text-muted">Editar</span>
            <Select value={s.editing} onValueChange={s.setEditing}>
              <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {s.elections.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {editingE && (
            <p className="-mt-2 px-0.5 text-[11px] text-muted">
              {Object.keys(editingE.localidades).length} localidades con datos · {editingE.puestos.length} puestos
              ({editingE.puestos.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng) || Boolean(stationForPuesto(p))).length} con coordenadas)
            </p>
          )}

          {editingE?.partyMode && (
            <div className="rounded-xl border border-accent/30 bg-accent/5 p-3">
              <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-accent">Filtro del Concejo</p>
              <Select value={resultView} onValueChange={(v) => s.setResultView(editingE.id, v as "party" | "candidate")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="party">Partido / lista</SelectItem>
                  <SelectItem value="candidate">Candidato más votado</SelectItem>
                </SelectContent>
              </Select>
              <p className="mt-1.5 text-[11px] leading-snug text-muted">
                {resultView === "party" ? "Agrupa los resultados por partido o lista." : "Muestra el candidato individual con más votos en cada localidad o puesto."}
              </p>
            </div>
          )}

          <Accordion type="multiple" className="flex flex-col gap-2">
            {/* Candidatos */}
            <AccordionItem value="cand">
              <AccordionTrigger>{editingE?.partyMode ? "Partidos, candidatos y colores" : "Candidatos, partidos y colores"}</AccordionTrigger>
              <AccordionContent>
                {editingE?.partyMode ? parties.map((party) => {
                  const c = editingE.candidates.find((candidate) => candidate.party === party);
                  if (!c) return null;
                  return (
                  <div key={party} className="flex items-center gap-1.5">
                    <input type="color" value={displayColor(editingE, party, "party")} onChange={(e) => s.recolorCandidate(editingE.id, c.id, e.target.value)}
                      className="h-7 w-8 cursor-pointer rounded-md border border-border bg-panel p-0.5" aria-label={`Color de ${party}`} />
                    <span className="flex-1 text-[11px] leading-snug">{party}</span>
                  </div>);
                }) : editingE?.candidates.length ? editingE.candidates.map((c) => (
                  <div key={c.id} className="flex items-center gap-1.5">
                    <input type="color" value={displayColor(editingE, c.id, "candidate")} onChange={(e) => s.recolorCandidate(editingE.id, c.id, e.target.value)}
                      className="h-7 w-8 cursor-pointer rounded-md border border-border bg-panel p-0.5" aria-label={`Color de ${c.name}`} />
                    <input type="text" defaultValue={c.name} onBlur={(e) => s.renameCandidate(editingE.id, c.id, e.target.value.trim() || c.name)}
                      className="h-7 flex-1 rounded-md border border-border bg-panel px-2 text-[12px]" />
                    <button onClick={() => s.removeCandidate(editingE.id, c.id)} className="flex h-6 w-6 items-center justify-center rounded-md text-faint hover:bg-c2/10 hover:text-c2">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )) : <p className="text-[11.5px] text-muted">Aún no hay candidatos. Se crean solos al importar un CSV, o añádelos aquí.</p>}
                <div className="flex gap-1.5">
                  <input value={newCand} onChange={(e) => setNewCand(e.target.value)} placeholder="Nuevo candidato o partido"
                    className="h-7.5 flex-1 rounded-md border border-border bg-panel px-2 text-[12px]" />
                  <Button size="sm" onClick={() => { if (newCand.trim() && editingE) { s.addCandidate(editingE.id, newCand.trim()); setNewCand(""); } }}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Archivos */}
            <AccordionItem value="files">
              <AccordionTrigger>Cargar datos</AccordionTrigger>
              <AccordionContent>
                {msg && <p className="rounded-md border border-border-soft bg-panel px-2 py-1.5 text-[11.5px]">{msg}</p>}

                <FileRow icon={Upload} label="Votos de la Registraduría (CSV por mesa)" hint="ZONA;PUESTO;LOCALIDAD;MESA;COMUNOMBRE;CANDIDATO;VOTOS" primary
                  onClick={() => fReg.current?.click()} />
                <input ref={fReg} type="file" accept=".csv,.txt" hidden onChange={() =>
                  withFile(fReg, (t) => {
                    const r = s.importRegistraduriaCSV(t, s.editing);
                    setMsg(`Listo: ${r.localidades} localidades y ${r.puestos} puestos. Se excluyeron ${r.skipped.toLocaleString("es-CO")} votos en blanco/nulos/no marcados.`);
                  })} />

                <FileRow icon={MapPinned} label="Coordenadas de puestos (CSV)" hint="zona, puesto, nombre, lat, lng"
                  onClick={() => fCoord.current?.click()} />
                <input ref={fCoord} type="file" accept=".csv,.txt" hidden onChange={() =>
                  withFile(fCoord, (t) => {
                    const r = s.importCoordsCSV(t, s.editing);
                    setMsg(`Coordenadas asignadas a ${r.ok}. Sin coincidencia: ${r.miss}. Puestos sin coordenadas: ${r.total - r.ok}.`);
                  })} />

                <details className="rounded-lg border border-border-soft bg-panel">
                  <summary className="cursor-pointer px-2.5 py-2 text-[11.5px] font-medium text-muted">Otros formatos simples</summary>
                  <div className="flex flex-col gap-2 border-t border-border-soft p-2.5">
                    <FileRow icon={Upload} label="Votos por localidad (CSV)" hint="localidad, candidato, votos" onClick={() => fLoc.current?.click()} />
                    <input ref={fLoc} type="file" accept=".csv,.txt" hidden onChange={() =>
                      withFile(fLoc, (t) => { const n = s.importLocalidadesCSV(t, s.editing); setMsg(`${n} filas importadas.`); })} />
                    <FileRow icon={Upload} label="Puestos con coordenadas (CSV)" hint="puesto, localidad, lat, lng, candidato, votos" onClick={() => fPue.current?.click()} />
                    <input ref={fPue} type="file" accept=".csv,.txt" hidden onChange={() =>
                      withFile(fPue, (t) => { const n = s.importPuestosCSV(t, s.editing); setMsg(`${n} filas importadas.`); })} />
                  </div>
                </details>
              </AccordionContent>
            </AccordionItem>

            {/* Votaciones y proyecto */}
            <AccordionItem value="proj">
              <AccordionTrigger>Votaciones y proyecto</AccordionTrigger>
              <AccordionContent>
                <div className="flex gap-1.5">
                  <input value={newElec} onChange={(e) => setNewElec(e.target.value)} placeholder="Nueva votación"
                    className="h-7.5 flex-1 rounded-md border border-border bg-panel px-2 text-[12px]" />
                  <Button size="sm" onClick={() => { if (newElec.trim()) { s.addElection(newElec.trim()); setNewElec(""); } }}><Plus className="h-3.5 w-3.5" /></Button>
                </div>
                {editingE && (
                  <>
                    <Button size="sm" variant="danger" onClick={() => { if (confirm(`¿Eliminar «${editingE.name}» y todos sus datos?`)) s.deleteElection(editingE.id); }}>
                      Eliminar «{editingE.name}»
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => { if (confirm(`¿Borrar los votos cargados de «${editingE.name}»?`)) s.clearElectionData(editingE.id); }}>
                      Vaciar datos de esta votación
                    </Button>
                  </>
                )}
                <div className="flex gap-1.5">
                  <Button size="sm" className="flex-1" onClick={() => download("datos-a-tener-en-cuenta.json", s.exportProject())}>
                    <FileJson className="h-3.5 w-3.5" />Exportar
                  </Button>
                  <Button size="sm" className="flex-1" onClick={() => fProj.current?.click()}>Importar proyecto</Button>
                </div>
                <input ref={fProj} type="file" accept=".json" hidden onChange={() =>
                  withFile(fProj, (t) => { s.importProject(t); setMsg("Proyecto importado."); })} />
                <p className="text-[11px] text-muted">El proyecto se guarda también en este navegador. Exporta un JSON para llevarlo a otro equipo.</p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      )}
    </motion.aside>
  );
}

function FileRow({ icon: Icon, label, hint, primary, onClick }: { icon: any; label: string; hint: string; primary?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={
        "flex items-start gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors " +
        (primary ? "border-accent-ink bg-gradient-to-br from-accent to-accent-ink text-on-accent hover:brightness-110" : "border-border-soft bg-panel hover:border-accent")
      }
    >
      <Icon className={"mt-0.5 h-3.5 w-3.5 shrink-0 " + (primary ? "text-on-accent" : "text-accent")} />
      <span>
        <span className="block text-[12px] font-semibold">{label}</span>
        <span className={"block text-[10.5px] leading-snug " + (primary ? "opacity-85" : "text-muted")}>{hint}</span>
      </span>
    </button>
  );
}
