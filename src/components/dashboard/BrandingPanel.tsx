"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Check, ChevronDown, Palette, RotateCcw } from "lucide-react";
import { useDashboardStore } from "@/store/useDashboardStore";
import { DEFAULT_PALETTES, type BrandPalette } from "@/lib/branding";
import { getSupabaseClient } from "@/lib/supabase";

function swatchText(color: string) {
  return color.toLowerCase();
}

export default function BrandingPanel() {
  const theme = useDashboardStore((state) => state.theme);
  const setTheme = useDashboardStore((state) => state.setTheme);
  const client = useMemo(() => getSupabaseClient(), []);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [observation, setObservation] = useState("");
  const [website, setWebsite] = useState("");
  const [observationNotice, setObservationNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function choosePalette(palette: BrandPalette) {
    setTheme(palette.id);
    setExpanded(palette.id);
  }

  async function submitObservation(event: FormEvent<HTMLFormElement>, paletteId: string) {
    event.preventDefault();
    if (website.trim()) {
      setObservation("");
      setObservationNotice("Gracias. La observación fue recibida.");
      return;
    }
    const text = observation.trim();
    if (!text || text.length > 1200 || !client) return;
    const last = Number(window.localStorage.getItem("dcp-branding:last-observation") ?? 0);
    if (Date.now() - last < 10_000) {
      setObservationNotice("Espera unos segundos antes de enviar otra observación.");
      return;
    }
    setSubmitting(true);
    const { error } = await client.from("brand_palette_observations").insert({ palette_id: paletteId, observation: text, website: "" });
    setSubmitting(false);
    if (error) {
      setObservationNotice("No fue posible guardar la observación en este momento.");
      return;
    }
    window.localStorage.setItem("dcp-branding:last-observation", String(Date.now()));
    setObservation("");
    setObservationNotice("Observación publicada. Gracias por aportar contexto.");
  }

  return (
    <section id="branding" className="branding-section relative overflow-hidden px-6 py-24 md:px-12 md:py-32">
      <div className="container-wide relative mx-auto">
        <div className="grid gap-8 md:grid-cols-[.55fr_1.45fr] md:items-end">
          <div>
            <p className="eyebrow flex items-center gap-3"><span className="font-mono text-signal">06</span><span className="h-px w-8 bg-signal/60" />Identidad visual</p>
            <h2 className="mt-5 font-display text-[clamp(3rem,7vw,6.5rem)] font-semibold leading-[.86] tracking-[-.065em]">Prueba el<br /><span className="text-stroke text-mist-100">branding.</span></h2>
          </div>
          <p className="max-w-xl text-sm leading-relaxed text-mist-900 md:pb-1">Explora las cinco propuestas. El cambio se guarda sólo en este navegador y se mantiene al recorrer todas las páginas. Restaurar tema vuelve al lenguaje editorial original.</p>
        </div>
        <div className="mt-12 grid gap-3 lg:grid-cols-2">
          {DEFAULT_PALETTES.map((palette) => {
            const isExpanded = expanded === palette.id;
            const isActive = theme === palette.id;
            return (
              <article key={palette.id} className={`palette-card ${isExpanded ? "palette-card-expanded" : "palette-card-collapsed"} ${isActive ? "palette-card-active" : ""}`}>
                <button type="button" className="palette-card-trigger" aria-expanded={isExpanded} onClick={() => setExpanded(isExpanded ? null : palette.id)}>
                  <span className="flex min-w-0 items-center gap-3"><span className="palette-mini-swatch" style={{ background: `linear-gradient(90deg, ${palette.colors.map((color) => color.hex).join(", ")})` }} /><span className="min-w-0 text-left"><span className="block truncate font-display text-xl leading-tight">{palette.name}</span><span className="mt-1 block truncate text-xs text-mist-900">{palette.description}</span></span></span>
                  <span className="flex shrink-0 items-center gap-2 text-signal"><ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />{isActive && <Check className="h-4 w-4" />}</span>
                </button>
                <div className="palette-card-details" aria-hidden={!isExpanded}>
                  <div className="palette-swatches">{palette.colors.map((color) => <div key={`${palette.id}-${color.hex}`} className="palette-color"><span className="palette-color-block" style={{ backgroundColor: color.hex }} /><span className="mt-2 block font-mono text-[10px] uppercase tracking-wider text-mist-700">{swatchText(color.hex)}</span><span className="mt-1 block text-[10px] text-mist-900">{color.role}</span></div>)}</div>
                  {palette.recommendation && <p className="mt-5 font-mono text-[10px] uppercase tracking-[.13em] text-signal">{palette.recommendation}</p>}
                  <div className="mt-5 flex flex-wrap gap-2"><button type="button" className="magnetic-button magnetic-button-primary min-h-10 px-4 text-[11px]" onClick={() => choosePalette(palette)}>{isActive ? "Tema aplicado" : "Probar paleta"} <Palette className="h-3.5 w-3.5" /></button><button type="button" className="magnetic-button magnetic-button-ghost min-h-10 px-4 text-[11px]" onClick={() => setTheme("tokyo")}>Restaurar tema <RotateCcw className="h-3.5 w-3.5" /></button></div>
                  <form className="mt-5 border-t border-white/10 pt-4" onSubmit={(event) => submitObservation(event, palette.id)}><label className="block text-[11px] text-mist-900">Observación pública <textarea value={observation} onChange={(event) => setObservation(event.target.value)} maxLength={1200} rows={3} placeholder="¿Qué funciona o qué cambiarías?" className="journal-input mt-2 resize-none" /></label><input tabIndex={-1} aria-hidden="true" autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} className="character-honeypot" /><div className="mt-2 flex items-center justify-between gap-3"><span className="text-[10px] text-mist-900">{observation.length}/1200 · sin nombre</span><button type="submit" disabled={submitting || !client} className="magnetic-button magnetic-button-ghost min-h-9 px-3 text-[10px]">{submitting ? "Guardando…" : "Compartir"}</button></div>{observationNotice && <p className="mt-2 text-[11px] text-signal" role="status">{observationNotice}</p>}</form>
                </div>
              </article>
            );
          })}
        </div>
        <p className="mt-5 text-xs text-mist-900">La paleta 4 no se incluye porque no aparece en la documentación fuente.</p>
      </div>
    </section>
  );
}
