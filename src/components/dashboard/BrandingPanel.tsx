"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Check, ChevronDown, Palette, Plus, RotateCcw, Save, Trash2, WandSparkles } from "lucide-react";
import { useDashboardStore } from "@/store/useDashboardStore";
import { BRAND_STORAGE_KEY, DEFAULT_PALETTES, PALETTE_ROLES, type BrandPalette, type BrandColor, type PaletteRole } from "@/lib/branding";
import { getSupabaseClient } from "@/lib/supabase";

const emptyDraft: BrandPalette = {
  id: "draft",
  name: "Mi paleta",
  description: "Una combinación para probar en toda la interfaz.",
  colors: [{ hex: "#B3262E", role: "Principal" }, { hex: "#FAF8F5", role: "Fondo" }, { hex: "#1F2328", role: "Texto" }],
  source: "custom",
};

function readCustomPalettes(): BrandPalette[] {
  try {
    const saved = JSON.parse(window.localStorage.getItem(BRAND_STORAGE_KEY) ?? "null") as { palettes?: BrandPalette[] } | null;
    return saved?.palettes?.filter((palette) => palette.source === "custom" && palette.colors?.length) ?? [];
  } catch {
    return [];
  }
}

function saveCustomPalettes(palettes: BrandPalette[]) {
  window.localStorage.setItem(BRAND_STORAGE_KEY, JSON.stringify({ palettes }));
}

function swatchText(color: string) { return color.toLowerCase(); }

function primaryPaletteColors(palette: BrandPalette): BrandColor[] {
  const primary = palette.colors.filter((color) => color.role === "Principal" || color.role === "Secundario");
  return (primary.length ? primary : palette.colors).slice(0, 2);
}

export default function BrandingPanel() {
  const theme = useDashboardStore((state) => state.theme);
  const setTheme = useDashboardStore((state) => state.setTheme);
  const client = useMemo(() => getSupabaseClient(), []);
  const [customPalettes, setCustomPalettes] = useState<BrandPalette[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [draft, setDraft] = useState<BrandPalette>(emptyDraft);
  const [showCreator, setShowCreator] = useState(false);
  const [observation, setObservation] = useState("");
  const [website, setWebsite] = useState("");
  const [observationNotice, setObservationNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => setCustomPalettes(readCustomPalettes()), []);

  const allPalettes = [...DEFAULT_PALETTES, ...customPalettes];

  function choosePalette(palette: BrandPalette) {
    setTheme(palette.id);
    setExpanded(palette.id);
  }

  function updateDraft(patch: Partial<BrandPalette>) { setDraft((current) => ({ ...current, ...patch })); }
  function updateDraftColor(index: number, patch: Partial<BrandColor>) {
    setDraft((current) => ({ ...current, colors: current.colors.map((color, i) => i === index ? { ...color, ...patch } : color) }));
  }
  function addDraftColor() {
    if (draft.colors.length >= 8) return;
    setDraft((current) => ({ ...current, colors: [...current.colors, { hex: "#A78BFA", role: "Apoyo" }] }));
  }
  function removeDraftColor(index: number) {
    if (draft.colors.length <= 1) return;
    setDraft((current) => ({ ...current, colors: current.colors.filter((_, i) => i !== index) }));
  }
  function createPalette(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const palette = { ...draft, id: `custom-${Date.now()}`, name: draft.name.trim() || "Mi paleta", colors: draft.colors.slice(0, 8), source: "custom" as const };
    const next = [...customPalettes, palette];
    setCustomPalettes(next);
    saveCustomPalettes(next);
    choosePalette(palette);
    setDraft({ ...emptyDraft, id: "draft" });
    setShowCreator(false);
  }
  function deleteCustomPalette(id: string) {
    const next = customPalettes.filter((palette) => palette.id !== id);
    setCustomPalettes(next);
    saveCustomPalettes(next);
    if (theme === id) setTheme("tokyo");
  }

  async function submitObservation(event: FormEvent<HTMLFormElement>, paletteId: string) {
    event.preventDefault();
    if (website.trim()) { setObservation(""); setObservationNotice("Gracias. La observación fue recibida."); return; }
    const text = observation.trim();
    if (!text || text.length > 1200 || !client) return;
    const last = Number(window.localStorage.getItem("dcp-branding:last-observation") ?? 0);
    if (Date.now() - last < 10_000) { setObservationNotice("Espera unos segundos antes de enviar otra observación."); return; }
    setSubmitting(true);
    const { error } = await client.from("brand_palette_observations").insert({ palette_id: paletteId, observation: text, website: "" });
    setSubmitting(false);
    if (error) { setObservationNotice("No fue posible guardar la observación en este momento."); return; }
    window.localStorage.setItem("dcp-branding:last-observation", String(Date.now()));
    setObservation(""); setObservationNotice("Observación publicada. Gracias por aportar contexto.");
  }

  return (
    <section id="branding" className="branding-section relative overflow-hidden px-6 py-24 md:px-12 md:py-32">
      <div className="container-wide relative mx-auto">
        <div className="grid gap-8 md:grid-cols-[.55fr_1.45fr] md:items-end">
          <div><p className="eyebrow flex items-center gap-3"><span className="font-mono text-signal">06</span><span className="h-px w-8 bg-signal/60" />Identidad visual</p><h2 className="mt-5 font-display text-[clamp(3rem,7vw,6.5rem)] font-semibold leading-[.86] tracking-[-.065em]">Diseña el<br /><span className="text-stroke text-mist-100">tema completo.</span></h2></div>
          <p className="max-w-xl text-sm leading-relaxed text-mist-900 md:pb-1">Cada color tiene un papel: fondo, superficie, texto, acción, borde o énfasis. Intercambia esos papeles y observa el resultado en toda la página, incluido el mapa y las secciones editoriales.</p>
        </div>
        <div className="mt-12 flex flex-wrap items-center justify-between gap-3"><p className="eyebrow text-signal">Paletas predeterminadas y tuyas</p><button type="button" className="magnetic-button magnetic-button-primary min-h-10 px-4 text-[11px]" onClick={() => setShowCreator((value) => !value)}><WandSparkles className="h-3.5 w-3.5" />{showCreator ? "Cerrar creador" : "Crear paleta"}</button></div>
        {showCreator && <PaletteCreator draft={draft} onChange={updateDraft} onColorChange={updateDraftColor} onAddColor={addDraftColor} onRemoveColor={removeDraftColor} onSubmit={createPalette} />}
        <div className="mt-6 grid gap-3 lg:grid-cols-2">{allPalettes.map((palette) => <PaletteCard key={palette.id} palette={palette} expanded={expanded === palette.id} active={theme === palette.id} onToggle={() => setExpanded(expanded === palette.id ? null : palette.id)} onChoose={() => choosePalette(palette)} onRestore={() => setTheme("tokyo")} onDelete={palette.source === "custom" ? () => deleteCustomPalette(palette.id) : undefined} observation={observation} setObservation={setObservation} website={website} setWebsite={setWebsite} notice={observationNotice} submitting={submitting} clientReady={Boolean(client)} onObservation={submitObservation} />)}</div>
        <p className="mt-5 text-xs text-mist-900">Anotaciones</p>
      </div>
    </section>
  );
}

function PaletteCreator({ draft, onChange, onColorChange, onAddColor, onRemoveColor, onSubmit }: { draft: BrandPalette; onChange: (patch: Partial<BrandPalette>) => void; onColorChange: (index: number, patch: Partial<BrandColor>) => void; onAddColor: () => void; onRemoveColor: (index: number) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <form className="palette-creator" onSubmit={onSubmit}><div className="flex items-start justify-between gap-4"><div><p className="eyebrow text-signal">Constructor local</p><h3 className="mt-1 font-display text-2xl">Crea una paleta y asigna sus roles</h3></div><Save className="h-5 w-5 text-signal" /></div><div className="mt-5 grid gap-3 md:grid-cols-2"><label className="palette-field">Nombre<input value={draft.name} onChange={(event) => onChange({ name: event.target.value })} maxLength={120} className="character-input" /></label><label className="palette-field">Descripción<input value={draft.description} onChange={(event) => onChange({ description: event.target.value })} maxLength={1200} className="character-input" /></label></div><div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{draft.colors.map((color, index) => <div className="palette-editor-color" key={`${index}-${color.hex}`}><input type="color" value={color.hex} onChange={(event) => onColorChange(index, { hex: event.target.value.toUpperCase() })} aria-label={`Color ${index + 1}`} /><input value={color.hex} onChange={(event) => onColorChange(index, { hex: event.target.value })} className="palette-hex" maxLength={7} /><select value={color.role} onChange={(event) => onColorChange(index, { role: event.target.value as PaletteRole })} className="palette-role-select">{PALETTE_ROLES.map((role) => <option key={role}>{role}</option>)}</select><button type="button" className="palette-remove" onClick={() => onRemoveColor(index)} disabled={draft.colors.length <= 1}><Trash2 className="h-3.5 w-3.5" />Quitar</button></div>)}</div><div className="mt-5 flex flex-wrap gap-2"><button type="button" className="magnetic-button magnetic-button-ghost min-h-10 px-4 text-[11px]" onClick={onAddColor} disabled={draft.colors.length >= 8}><Plus className="h-3.5 w-3.5" />Añadir color ({draft.colors.length}/8)</button><button type="submit" className="magnetic-button magnetic-button-primary min-h-10 px-4 text-[11px]"><Save className="h-3.5 w-3.5" />Guardar y probar</button></div></form>;
}

function PaletteCard({ palette, expanded, active, onToggle, onChoose, onRestore, onDelete, observation, setObservation, website, setWebsite, notice, submitting, clientReady, onObservation }: { palette: BrandPalette; expanded: boolean; active: boolean; onToggle: () => void; onChoose: () => void; onRestore: () => void; onDelete?: () => void; observation: string; setObservation: (value: string) => void; website: string; setWebsite: (value: string) => void; notice: string | null; submitting: boolean; clientReady: boolean; onObservation: (event: FormEvent<HTMLFormElement>, id: string) => void }) {
  const previewColors = primaryPaletteColors(palette);
  return <article className={`palette-card ${expanded ? "palette-card-expanded" : "palette-card-collapsed"} ${active ? "palette-card-active" : ""}`}><button type="button" className="palette-card-trigger" aria-expanded={expanded} onClick={onToggle}><span className="flex min-w-0 items-center gap-3"><span className="palette-mini-swatch" style={{ background: `linear-gradient(135deg, ${previewColors.map((color) => color.hex).join(", ")})` }} /><span className="min-w-0 text-left"><span className="block truncate font-display text-xl leading-tight">{palette.name}</span><span className="mt-1 block truncate text-xs text-mist-900">{palette.description}</span></span></span><span className="flex shrink-0 items-center gap-2 text-signal"><ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} />{active && <Check className="h-4 w-4" />}</span></button><div className="palette-card-details" aria-hidden={!expanded}><div className="palette-swatches">{previewColors.map((color) => <div key={`${palette.id}-${color.hex}`} className="palette-color"><span className="palette-color-block" style={{ backgroundColor: color.hex }} /><span className="mt-2 block font-mono text-[10px] uppercase tracking-wider text-mist-700">{swatchText(color.hex)}</span><span className="mt-1 block text-[10px] text-mist-900">{color.role}</span></div>)}</div><div className="mt-5 flex flex-wrap gap-2"><button type="button" className="magnetic-button magnetic-button-primary min-h-10 px-4 text-[11px]" onClick={onChoose}>{active ? "Tema aplicado" : "Probar paleta"} <Palette className="h-3.5 w-3.5" /></button><button type="button" className="magnetic-button magnetic-button-ghost min-h-10 px-4 text-[11px]" onClick={onRestore}>Restaurar tema <RotateCcw className="h-3.5 w-3.5" /></button>{onDelete && <button type="button" className="magnetic-button magnetic-button-ghost min-h-10 px-4 text-[11px]" onClick={onDelete}><Trash2 className="h-3.5 w-3.5" />Eliminar</button>}</div><form className="mt-5 border-t border-white/10 pt-4" onSubmit={(event) => onObservation(event, palette.id)}><label className="block text-[11px] text-mist-900">Observación pública<textarea value={observation} onChange={(event) => setObservation(event.target.value)} maxLength={1200} rows={3} placeholder="¿Qué funciona o qué cambiarías?" className="journal-input mt-2 resize-none" /></label><input tabIndex={-1} aria-hidden="true" autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} className="character-honeypot" /><div className="mt-2 flex items-center justify-between gap-3"><span className="text-[10px] text-mist-900">{observation.length}/1200 · sin nombre</span><button type="submit" disabled={submitting || !clientReady} className="magnetic-button magnetic-button-ghost min-h-9 px-3 text-[10px]">{submitting ? "Guardando…" : "Compartir"}</button></div>{notice && <p className="mt-2 text-[11px] text-signal" role="status">{notice}</p>}</form></div></article>;
}
