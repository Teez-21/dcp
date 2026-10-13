"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  BarChart3,
  ChevronRight,
  Database,
  Landmark,
  BookOpen,
  Trash2,
  MapPinned,
  MessageCircle,
  NotebookPen,
  Radar,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { useDashboardStore } from "@/store/useDashboardStore";
import type { JournalTopic } from "@/store/useDashboardStore";
import { sumVotes, ranking, nameOf } from "@/lib/electoral";
import { getSupabaseClient } from "@/lib/supabase";
import ControlDeck from "./ControlDeck";
import ConstellationGrid from "./ConstellationGrid";
import BrandingPanel from "./BrandingPanel";
import CharacterHub from "../characters/CharacterHub";
import CouncilDataSection from "./CouncilDataSection";
import CouncilOverviewSection from "./CouncilOverviewSection";

const MapCanvas = dynamic(() => import("./MapCanvas"), { ssr: false });

const EASE = [0.25, 0.46, 0.45, 0.94] as const;

type Anchor = { id: string; label: string; icon: LucideIcon };
const ANCHORS: Anchor[] = [
  { id: "inicio", label: "Inicio", icon: Radar },
  { id: "señales", label: "Señales", icon: BarChart3 },
  { id: "datos-concejo", label: "Datos del concejo", icon: Landmark },
  { id: "territorio", label: "Territorio", icon: MapPinned },
  { id: "percepcion", label: "Percepción ciudadana", icon: MessageCircle },
  { id: "personajes", label: "Personajes", icon: Activity },
  { id: "sugerencias", label: "Sugerencias", icon: NotebookPen },
];

type CitizenSurvey = { id: string; shortName: string; title: string; description: string; embedTitle: string; embedUrl: string; sourceLabel: string; sourceUrl: string };

const CITIZEN_SURVEYS: CitizenSurvey[] = [
  {
    id: "bogota-como-vamos-2025",
    shortName: "Bogotá Cómo Vamos",
    title: "Encuesta de Percepción Ciudadana · Bogotá Cómo Vamos",
    description: "Por ahora, esta sección presenta la información de la Encuesta de Percepción Ciudadana de Bogotá Cómo Vamos. El informe se muestra directamente desde Power BI.",
    embedTitle: "EPC BCV",
    embedUrl: "https://app.powerbi.com/view?r=eyJrIjoiODQzNTVjNGQtM2YxMy00Y2NlLTk3ZGYtZTBhNThjMTA4MmQwIiwidCI6ImFjYTUxNjMxLTAwZmUtNDkwZC05MWFiLTE2M2VmODcyNjBlZSIsImMiOjR9",
    sourceLabel: "Encuesta de Percepción Ciudadana 2025",
    sourceUrl: "https://bogotacomovamos.org/encuesta-de-percepcion-ciudadana-2025/",
  },
  {
    id: "ccb-victimizacion-2025",
    shortName: "Victimización CCB",
    title: "Encuesta de Victimización 2025 · Cámara de Comercio de Bogotá",
    description: "Esta encuesta presenta información sobre percepción de seguridad, victimización y otros aspectos de la experiencia ciudadana en Bogotá.",
    embedTitle: "Encuesta de victimización CCB",
    embedUrl: "https://app.powerbi.com/view?r=eyJrIjoiZGY4YWFhZGEtZTEyYy00MTM5LTg2MjEtMGRjYjY1ZjE3ZWMxIiwidCI6ImFjYTUxNjMxLTAwZmUtNDkwZC05MWFiLTE2M2VmODcyNjBlZSIsImMiOjR9",
    sourceLabel: "Documento oficial de la Encuesta de Victimización 2025",
    sourceUrl: "https://bibliotecadigital.ccb.org.co/server/api/core/bitstreams/8551dacc-c4c4-408c-8909-671a645731dc/content",
  },
];

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function Dashboard() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const elections = useDashboardStore((s) => s.elections);
  const visible = useDashboardStore((s) => s.visible);
  const ensurePreloadedData = useDashboardStore((s) => s.ensurePreloadedData);
  const loadPreloadedConcejo = useDashboardStore((s) => s.loadPreloadedConcejo);
  const loadPreloadedCamara = useDashboardStore((s) => s.loadPreloadedCamara);
  const { scrollY, scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });
  const heroOpacity = useTransform(scrollY, [0, 650], [1, 0.2]);
  const heroScale = useTransform(scrollY, [0, 650], [1, 0.94]);
  const heroY = useTransform(scrollY, [0, 650], [0, 100]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 72);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    ensurePreloadedData();
    const timer = window.setTimeout(ensurePreloadedData, 150);
    return () => window.clearTimeout(timer);
  }, [ensurePreloadedData]);

  useEffect(() => {
    loadPreloadedConcejo().catch(() => undefined);
  }, [loadPreloadedConcejo]);

  useEffect(() => {
    loadPreloadedCamara().catch(() => undefined);
  }, [loadPreloadedCamara]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("election") !== "concejo") return;
    useDashboardStore.getState().focusElection("concejo");
    window.setTimeout(() => scrollToId("territorio"), 350);
    window.history.replaceState({}, "", `${window.location.pathname}${window.location.hash}`);
  }, []);

  const summary = useMemo(() => {
    const active = elections.filter((e) => visible.includes(e.id));
    const votes = active.reduce((total, election) => total + Object.values(election.localidades).reduce((sum, row) => sum + sumVotes(row), 0), 0);
    const localityCount = 20;
    const postCount = active.reduce((total, election) => total + election.puestos.length, 0);
    const candidateCount = active.reduce((total, election) => total + election.candidates.length, 0);
    const primary = active[active.length - 1];
    const leaders = primary ? ranking(Object.values(primary.localidades)[0]).slice(0, 3).map(([id, value]) => ({ name: nameOf(primary, id), value })) : [];
    const averageVotes = active.length ? Math.round(votes / active.length) : 0;
    return { active, votes, localityCount, postCount, candidateCount, averageVotes, leaders };
  }, [elections, visible]);

  return (
    <div ref={rootRef} className="nexus-page relative min-h-screen overflow-x-clip bg-ink-950 text-mist-100">
      <motion.div className="scroll-progress" style={{ scaleX: progress }} />
      <ConstellationGrid />
      <div className="grain pointer-events-none fixed inset-0 z-[1]" />
      <KineticNav scrolled={scrolled} />

      <main className="relative z-10">
        <section id="inicio" className="nexus-hero relative flex min-h-screen items-center overflow-hidden px-6 pb-20 pt-32 md:px-12">
          <div className="hero-orb hero-orb-one" />
          <div className="hero-orb hero-orb-two" />
          <div className="container-wide relative mx-auto w-full">
            <motion.div style={{ opacity: heroOpacity, scale: heroScale, y: heroY }} className="max-w-6xl">
              <Reveal delay={0.05}><p className="eyebrow mb-7"><span className="status-dot" />Centro de inteligencia · {new Date().getFullYear()}</p></Reveal>
              <h1 className="font-display text-[clamp(4rem,12vw,11rem)] font-semibold leading-[.82] tracking-[-.075em] text-mist-100">
                <HeroWord delay={0.12}>Hub</HeroWord>{" "}
                <HeroWord delay={0.2}>-</HeroWord>{" "}<br className="hidden md:block" />
                <HeroWord delay={0.28} className="text-signal">Concejo de Bogotá</HeroWord>
              </h1>
              <Reveal delay={0.52} className="mt-10 max-w-xl"><p className="max-w-lg text-[15px] leading-relaxed text-mist-900 md:text-lg">Esta página busca mostrar datos relevantes para la campaña, desde la distribución del voto en Bogotá hasta los temas tratados por el Concejo de Bogotá, el branding y personajes importantes de la izquierda en Bogotá y Colombia.</p></Reveal>
              <Reveal delay={0.62} className="mt-8 flex flex-wrap items-center gap-3"><button className="magnetic-button magnetic-button-primary" onClick={() => scrollToId("señales")}>Explorar señales <ArrowDown className="h-4 w-4" /></button><button className="magnetic-button magnetic-button-ghost" onClick={() => scrollToId("territorio")}>Ver territorio <ChevronRight className="h-4 w-4" /></button></Reveal>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.9, duration: 0.9, ease: EASE }} className="hero-index hidden md:block"><span>01</span><span className="h-20 w-px bg-signal/70" /><span>07</span></motion.div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }} className="absolute bottom-0 left-0 flex items-center gap-3 text-[10px] uppercase tracking-[.22em] text-mist-900"><span className="animate-bounce"><ArrowDown className="h-4 w-4 text-signal" /></span>Desplázate para descubrir</motion.div>
          </div>
        </section>

        <MarqueeStrip />

        <section id="señales" className="nexus-section relative px-6 py-28 md:px-12 md:py-40">
          <div className="container-wide mx-auto">
            <SectionHeader index="02" kicker="Señales en movimiento" title="Datos electorales" description="Para ver lo importante, territorios relevantes, cambios en el comportamiento de la votación y moverse con intención y objetivo." />
            <div className="mt-16 grid gap-4 md:grid-cols-12">
              <MetricCard className="md:col-span-5" label="Votaciones activas" value={`${summary.active.length}/${elections.length}`} detail="seleccionadas para explorar" icon={Radar} accent="lime" />
              <MetricCard className="md:col-span-3" label="Localidades" value="20" detail="localidades de Bogotá" icon={MapPinned} accent="violet" />
              <MetricCard className="md:col-span-4" label="Votos procesados" value={summary.votes ? formatCompact(summary.votes) : "—"} detail={summary.candidateCount ? `${summary.candidateCount} actores detectados` : "esperando una fuente de datos"} icon={Database} accent="orange" />
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-12">
              <Reveal className="bento-card bento-card-dark md:col-span-7" delay={0.05}><div className="flex items-start justify-between"><div><p className="eyebrow text-signal">Promedio de votos por votación activa</p><h3 className="mt-4 max-w-md font-display text-3xl leading-tight tracking-tight md:text-5xl">{summary.averageVotes ? formatCompact(summary.averageVotes) : "—"}</h3></div><Sparkles className="h-6 w-6 text-signal" /></div><div className="signal-wave mt-16"><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /></div><p className="mt-5 max-w-sm text-sm leading-relaxed text-mist-900">Promedio calculado con las votaciones activas seleccionadas para explorar.</p></Reveal>
              <Reveal className="bento-card bento-card-signal md:col-span-5" delay={0.12}><p className="eyebrow text-ink-950/60">Todas las votaciones activas</p><h3 className="mt-4 font-display text-3xl leading-tight tracking-tight text-ink-950">{summary.active.length ? summary.active.map((election) => election.name).join(" · ") : "Sin votaciones activas"}</h3><div className="mt-16 flex items-end justify-between"><span className="font-mono text-xs uppercase tracking-widest text-ink-950/60">{summary.postCount} puestos</span><Activity className="h-10 w-10 text-ink-950/60" /></div></Reveal>
            </div>
          </div>
        </section>

        <section id="datos-concejo" className="nexus-section relative px-6 py-28 md:px-12 md:py-40">
          <div className="container-wide mx-auto">
            <SectionHeader index="03" kicker="Representación política" title={<>Datos del<br /><span className="text-stroke text-mist-100">concejo.</span></>} description="Una lectura visual de las bancadas y concejales que integran el Concejo de Bogotá. Cada punto se puede explorar para consultar nombre, partido y votos registrados." />
            <CouncilDataSection />
            <CouncilOverviewSection />
          </div>
        </section>
        <section id="territorio" className="nexus-section nexus-map-section relative px-4 py-24 md:px-8 md:py-32">
          <div className="container-wide mx-auto">
            <SectionHeader index="04" kicker="Territorio interactivo" title={<>¿Cómo se distribuyeron<br /><span className="text-stroke text-mist-100">los votos en el territorio?</span></>} description="El mapa busca mostrar cómo se distribuyeron los votos de las últimas 5 elecciones por localidad, UPZ y puesto de votación en Bogotá para identificar zonas de interés para actividades programáticas." />
            <div className="map-shell relative mt-14 h-[min(78vh,780px)] min-h-[580px] overflow-hidden rounded-[2rem] border border-white/10 bg-ink-900 shadow-2xl shadow-black/30">
              <div className="absolute inset-0 z-0"><MapCanvas /></div>
              <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-ink-950/60 via-transparent to-ink-950/10" />
              <div className="pointer-events-none absolute left-5 top-5 z-[700] hidden rounded-full border border-white/10 bg-ink-950/70 px-3 py-2 text-[10px] uppercase tracking-[.18em] text-mist-900 backdrop-blur md:block"><span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-signal shadow-[0_0_14px_#c4b5fd]" />Live territory canvas</div>
              <div className="pointer-events-none absolute inset-0 z-[800]"><ControlDeck /></div>
            </div>
            <MapCommentsPanel />
          </div>
        </section>

        <section id="percepcion" className="nexus-section relative px-6 py-28 md:px-12 md:py-40">
          <div className="container-wide mx-auto">
            <SectionHeader index="05" kicker="Percepción ciudadana" title={<>Lo que piensa<br /><span className="text-stroke text-mist-100">la ciudad.</span></>} description="Información sobre la Encuesta de Percepción Ciudadana de Bogotá Cómo Vamos, la Encuesta Distrital de Percepción de la Secretaría Distrital de Planeación y la Encuesta de Percepción y Victimización de la CCB." />
            <CitizenPerceptionSection />
          </div>
        </section>

        <section id="personajes" className="nexus-section relative px-6 py-28 md:px-12 md:py-40">
          <div className="container-wide mx-auto">
            <SectionHeader index="06" kicker="Directorio compartido" title={<>Personajes<br /><span className="text-stroke text-mist-100">importantes.</span></>} description="Una lista pública de actores relevantes para leer vínculos, trayectorias y contexto. Cualquier persona puede proponer una ficha; la cuenta editorial decide cuáles se publican." />
            <div className="mt-8 overflow-hidden rounded-[2rem] border border-white/10 bg-ink-950/35"><CharacterHub embedded /></div>
          </div>
        </section>

        <BrandingPanel />

        <SuggestionsSection />
      </main>

      <BackToTop visible={scrolled} />
    </div>
  );
}

function CitizenPerceptionSection() {
  const client = useMemo(() => getSupabaseClient(), []);
  const [activeId, setActiveId] = useState(CITIZEN_SURVEYS[0].id);
  const [observations, setObservations] = useState<Record<string, Array<{ id: string; observation: string; created_at: string }>>>({});
  const [observation, setObservation] = useState("");
  const [website, setWebsite] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const survey = CITIZEN_SURVEYS.find((item) => item.id === activeId) ?? CITIZEN_SURVEYS[0];

  useEffect(() => {
    if (!client || observations[survey.id]) return;
    let cancelled = false;
    setLoading(true);
    client.from("citizen_survey_observations").select("id, observation, created_at").eq("survey_id", survey.id).order("created_at", { ascending: false }).limit(30).then(({ data, error }) => {
      if (cancelled) return;
      setLoading(false);
      if (error) { setNotice("No fue posible cargar las observaciones en este momento."); return; }
      setObservations((current) => ({ ...current, [survey.id]: (data ?? []) as Array<{ id: string; observation: string; created_at: string }> }));
    });
    return () => { cancelled = true; };
  }, [client, observations, survey.id]);

  function changeSurvey(id: string) {
    setActiveId(id);
    setObservation("");
    setNotice(null);
  }

  async function submitObservation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (website.trim()) { setObservation(""); setNotice("Gracias. La observación fue recibida."); return; }
    const text = observation.trim();
    if (!text || text.length > 1200 || !client) return;
    const last = Number(window.localStorage.getItem("dcp-surveys:last-observation") ?? 0);
    if (Date.now() - last < 10_000) { setNotice("Espera unos segundos antes de enviar otra observación."); return; }
    setSubmitting(true);
    const { data, error } = await client.from("citizen_survey_observations").insert({ survey_id: survey.id, observation: text, website: "" }).select("id, observation, created_at").single();
    setSubmitting(false);
    if (error) { setNotice("No fue posible guardar la observación en este momento."); return; }
    window.localStorage.setItem("dcp-surveys:last-observation", String(Date.now()));
    setObservations((current) => ({ ...current, [survey.id]: [data as { id: string; observation: string; created_at: string }, ...(current[survey.id] ?? [])] }));
    setObservation("");
    setNotice("Observación publicada. Gracias por aportar contexto.");
  }

  return <Reveal className="mt-14" delay={0.08}>
    <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-ink-900 shadow-2xl shadow-black/30">
      <div className="flex flex-wrap border-b border-white/10" role="tablist" aria-label="Encuestas de percepción ciudadana">
        {CITIZEN_SURVEYS.map((item) => <button key={item.id} type="button" role="tab" aria-selected={activeId === item.id} onClick={() => changeSurvey(item.id)} className={`border-b-2 px-5 py-4 text-left text-xs uppercase tracking-[.12em] transition-colors md:px-8 ${activeId === item.id ? "border-signal text-signal" : "border-transparent text-mist-900 hover:text-mist-100"}`}>{item.shortName}</button>)}
      </div>
      <div className="border-b border-white/10 px-6 py-5 md:px-8">
        <p className="eyebrow text-signal">Fuente disponible</p>
        <h3 className="mt-2 font-display text-2xl tracking-tight md:text-3xl">{survey.title}</h3>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-mist-900">{survey.description}</p>
      </div>
      <div className="relative aspect-[600/373.5] min-h-[420px] w-full bg-black/20 md:min-h-[560px]"><iframe title={survey.embedTitle} src={survey.embedUrl} className="absolute inset-0 h-full w-full border-0" allowFullScreen /></div>
      <div className="border-t border-white/10 px-6 py-5 md:px-8">
        <div className="flex flex-col gap-2 text-sm leading-relaxed text-mist-900 md:flex-row md:items-center md:justify-between"><p>Créditos: <strong className="text-mist-100">{survey.id === "ccb-victimizacion-2025" ? "Cámara de Comercio de Bogotá" : "Bogotá Cómo Vamos"}</strong>. Más información en la fuente oficial.</p><a href={survey.sourceUrl} target="_blank" rel="noreferrer" className="module-link shrink-0">Ver {survey.sourceLabel} <ChevronRight className="h-4 w-4" /></a></div>
        <div className="mt-6 grid gap-6 border-t border-white/10 pt-5 lg:grid-cols-[.8fr_1.2fr]">
          <form onSubmit={submitObservation}>
            <p className="eyebrow text-signal">Observaciones · {survey.shortName}</p>
            <label className="mt-3 block text-sm text-mist-900">Comparte una observación sobre esta encuesta<textarea value={observation} onChange={(event) => setObservation(event.target.value)} maxLength={1200} rows={5} placeholder="Escribe un hallazgo, pregunta o contexto…" className="journal-input mt-2 resize-none" /></label>
            <input tabIndex={-1} aria-hidden="true" autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} className="character-honeypot" />
            <div className="mt-2 flex items-center justify-between gap-3"><span className="text-[10px] text-mist-900">{observation.length}/1200 · sin nombre</span><button type="submit" disabled={submitting || !clientReady(client)} className="magnetic-button magnetic-button-ghost min-h-9 px-3 text-[10px]">{submitting ? "Guardando…" : "Compartir observación"}</button></div>
            {notice && <p className="mt-2 text-[11px] text-signal" role="status">{notice}</p>}
          </form>
          <div><p className="eyebrow text-signal">Aportes sobre esta encuesta</p>{loading ? <p className="mt-3 text-sm text-mist-900">Cargando observaciones…</p> : (observations[survey.id] ?? []).length === 0 ? <p className="mt-3 text-sm leading-relaxed text-mist-900">Todavía no hay observaciones. Sé la primera persona en añadir contexto.</p> : <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">{observations[survey.id].map((item) => <article key={item.id} className="journal-entry"><p className="whitespace-pre-wrap text-sm leading-relaxed text-mist-100">{item.observation}</p><time className="mt-2 block font-mono text-[9px] uppercase tracking-widest text-mist-900">{new Date(item.created_at).toLocaleDateString("es-CO")}</time></article>)}</div>}</div>
        </div>
      </div>
    </div>
  </Reveal>;
}

function clientReady(client: ReturnType<typeof getSupabaseClient>) {
  return Boolean(client);
}

function MapCommentsPanel() {
  const client = useMemo(() => getSupabaseClient(), []);
  const loaded = useRef(false);
  const [comments, setComments] = useState<Array<{ id: string; observation: string; created_at: string }>>([]);
  const [comment, setComment] = useState("");
  const [website, setWebsite] = useState("");
  const [loading, setLoading] = useState(Boolean(client));
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!client || loaded.current) return;
    loaded.current = true;
    client.from("map_observations").select("id, observation, created_at").order("created_at", { ascending: false }).limit(50).then(({ data, error }) => {
      setLoading(false);
      if (error) { setNotice("No fue posible cargar los comentarios del mapa."); return; }
      setComments((data ?? []) as Array<{ id: string; observation: string; created_at: string }>);
    });
  }, [client]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (website.trim()) { setComment(""); setNotice("Gracias. El comentario fue recibido."); return; }
    const text = comment.trim();
    if (!client || !text || text.length > 1200) return;
    const last = Number(window.localStorage.getItem("dcp-map:last-comment") ?? 0);
    if (Date.now() - last < 10_000) { setNotice("Espera unos segundos antes de publicar otro comentario."); return; }
    setSubmitting(true);
    const { data, error } = await client.from("map_observations").insert({ observation: text, website: "" }).select("id, observation, created_at").single();
    setSubmitting(false);
    if (error) { setNotice("No fue posible guardar el comentario en este momento."); return; }
    window.localStorage.setItem("dcp-map:last-comment", String(Date.now()));
    setComments((current) => [data as { id: string; observation: string; created_at: string }, ...current]);
    setComment("");
    setNotice("Comentario publicado y visible para todos.");
  }

  return <Reveal className="mt-5" delay={0.08}>
    <div className="grid gap-5 rounded-[1.5rem] border border-white/10 bg-ink-900/80 p-5 md:p-7 lg:grid-cols-[.8fr_1.2fr]">
      <form onSubmit={submit}>
        <p className="eyebrow text-signal">Observaciones del mapa</p>
        <h3 className="mt-2 font-display text-2xl tracking-tight md:text-3xl">Comparte una lectura del territorio</h3>
        <p className="mt-3 text-sm leading-relaxed text-mist-900">Los comentarios se guardan en Supabase y quedan visibles para todas las personas que consulten el mapa.</p>
        <label className="mt-5 block text-sm text-mist-900">Comentario<textarea value={comment} onChange={(event) => setComment(event.target.value)} maxLength={1200} rows={5} placeholder="Escribe un hallazgo, pregunta o contexto sobre el mapa…" className="journal-input mt-2 resize-none" /></label>
        <input tabIndex={-1} aria-hidden="true" autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} className="character-honeypot" />
        <div className="mt-2 flex items-center justify-between gap-3"><span className="text-[10px] text-mist-900">{comment.length}/1200 · sin nombre</span><button type="submit" disabled={submitting || !client} className="magnetic-button magnetic-button-primary min-h-9 px-3 text-[10px]">{submitting ? "Guardando…" : "Publicar comentario"}</button></div>
        {!client && <p className="mt-2 text-[11px] text-amber-200">Supabase no está configurado en este entorno.</p>}
        {notice && <p className="mt-2 text-[11px] text-signal" role="status">{notice}</p>}
      </form>
      <div>
        <p className="eyebrow text-signal">Comentarios compartidos</p>
        {loading ? <p className="mt-3 text-sm text-mist-900">Cargando comentarios…</p> : comments.length === 0 ? <p className="mt-3 text-sm leading-relaxed text-mist-900">Todavía no hay comentarios. Sé la primera persona en compartir una lectura.</p> : <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">{comments.map((item) => <article key={item.id} className="journal-entry"><p className="whitespace-pre-wrap text-sm leading-relaxed text-mist-100">{item.observation}</p><time className="mt-2 block font-mono text-[9px] uppercase tracking-widest text-mist-900">{new Date(item.created_at).toLocaleDateString("es-CO")}</time></article>)}</div>}
      </div>
    </div>
  </Reveal>;
}

function KineticNav({ scrolled }: { scrolled: boolean }) {
  return <header className={`nexus-nav ${scrolled ? "nexus-nav-scrolled" : ""}`}><button className="nexus-mark" aria-label="Ir al inicio" onClick={() => scrollToId("inicio")}><span /> <span /> <span /></button><nav className="flex items-center gap-1.5" aria-label="Navegación por secciones">{ANCHORS.map(({ id, label, icon: Icon }) => <button key={id} title={label} aria-label={label} onClick={() => scrollToId(id)} className="nexus-icon-button"><Icon className="h-[17px] w-[17px]" strokeWidth={1.7} /></button>)}</nav><div className="hidden items-center gap-2 text-[10px] uppercase tracking-[.17em] text-mist-900 md:flex"><span className="status-dot" />Scroll / explore</div></header>;
}

function SectionHeader({ index, kicker, title, description }: { index: string; kicker: string; title: React.ReactNode; description: string }) {
  return <div className="grid gap-8 md:grid-cols-[.35fr_1.2fr_.8fr] md:items-end"><div className="eyebrow flex items-center gap-3"><span className="font-mono text-signal">{index}</span><span className="h-px w-8 bg-signal/60" />{kicker}</div><h2 className="font-display text-[clamp(3rem,7vw,7rem)] font-semibold leading-[.86] tracking-[-.065em]">{title}</h2><p className="max-w-sm text-sm leading-relaxed text-mist-900 md:pb-1">{description}</p></div>;
}

function MetricCard({ label, value, detail, icon: Icon, accent, className = "" }: { label: string; value: string; detail: string; icon: LucideIcon; accent: string; className?: string }) {
  return <Reveal className={`metric-card ${className}`}><div className={`metric-icon metric-${accent}`}><Icon className="h-5 w-5" /></div><p className="eyebrow mt-10">{label}</p><p className="mt-3 font-display text-5xl font-semibold tracking-[-.05em] text-mist-100">{value}</p><p className="mt-2 text-xs text-mist-900">{detail}</p></Reveal>;
}

function Reveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return <motion.div initial={{ opacity: 0, y: 52 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.8, delay, ease: EASE }} className={className}>{children}</motion.div>;
}

function HeroWord({ children, delay, className = "" }: { children: React.ReactNode; delay: number; className?: string }) {
  return <motion.span initial={{ opacity: 0, y: 60, rotateX: -40 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} transition={{ delay, duration: 0.75, ease: EASE }} className={`inline-block ${className}`}>{children}</motion.span>;
}

function MarqueeStrip() {
  return <div className="marquee-strip relative z-10 overflow-hidden border-y border-white/10 py-5"><div className="marquee-track">{["Intención", "Territorio", "Actores", "Agenda", "Contexto", "Señales", "Intención", "Territorio", "Actores", "Agenda", "Contexto", "Señales"].map((item, i) => <span key={`${item}-${i}`}>{item}<b>◆</b></span>)}</div></div>;
}

function SuggestionsSection() {
  const topics = useDashboardStore((s) => s.journalTopics);
  const addTopic = useDashboardStore((s) => s.addJournalTopic);
  const addEntry = useDashboardStore((s) => s.addJournalEntry);
  const deleteTopic = useDashboardStore((s) => s.deleteJournalTopic);
  const deleteEntry = useDashboardStore((s) => s.deleteJournalEntry);
  const [topicTitle, setTopicTitle] = useState("");
  const [topicDescription, setTopicDescription] = useState("");
  const [openTopic, setOpenTopic] = useState<string | null>(null);
  function createTopic(event: React.FormEvent) {
    event.preventDefault();
    if (!topicTitle.trim()) return;
    const topicId = addTopic(topicTitle, topicDescription);
    if (topicId) setOpenTopic(topicId);
    setTopicTitle(""); setTopicDescription("");
  }
  return <section id="sugerencias" className="nexus-section journal-section relative overflow-hidden px-6 py-28 md:px-12 md:py-40">
    <div className="container-wide relative mx-auto">
      <SectionHeader index="07" kicker="Sugerencias" title={<>Temas para<br /><span className="text-stroke text-mist-100">pensar mejor.</span></>} description="Sugerencias, anotaciones u otros que merezcan ser anotados." />
      <div className="mt-14 grid gap-5 lg:grid-cols-[.8fr_1.4fr]">
        <Reveal className="journal-compose" delay={0.05}><div className="flex items-center gap-3"><span className="journal-icon"><BookOpen className="h-5 w-5" /></span><div><p className="eyebrow text-signal">Nuevo tema</p><h3 className="mt-1 font-display text-2xl">Abre una línea de trabajo</h3></div></div><form onSubmit={createTopic} className="mt-7 space-y-3"><input value={topicTitle} onChange={(e) => setTopicTitle(e.target.value)} placeholder="Ej. Elecciones 2027" className="journal-input" /><textarea value={topicDescription} onChange={(e) => setTopicDescription(e.target.value)} placeholder="Descripción breve del tema (opcional)" rows={4} className="journal-input resize-none" /><button type="submit" className="magnetic-button magnetic-button-primary w-full justify-center">Crear tema <BookOpen className="h-4 w-4" /></button></form><p className="mt-4 text-xs leading-relaxed text-mist-900">Los temas y sus entradas se guardan automáticamente en este navegador.</p></Reveal>
        <div className="space-y-3">{topics.length === 0 ? <Reveal className="journal-empty"><BookOpen className="h-7 w-7 text-signal" /><h3 className="mt-4 font-display text-2xl">Tus sugerencias están listas.</h3><p className="mt-2 max-w-sm text-sm leading-relaxed text-mist-900">Crea el primer tema para comenzar a guardar contexto, decisiones y aprendizajes.</p></Reveal> : topics.map((topic, index) => <JournalTopicCard key={topic.id} topic={topic} index={index} open={openTopic === topic.id} onToggle={() => setOpenTopic(openTopic === topic.id ? null : topic.id)} onAddEntry={addEntry} onDeleteTopic={() => deleteTopic(topic.id)} onDeleteEntry={deleteEntry} />)}</div>
      </div>
      <div className="mt-20 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-5 text-[10px] uppercase tracking-[.18em] text-mist-900 md:flex-row"><span>Datos a tener en cuenta</span><span>© {new Date().getFullYear()}</span></div>
    </div>
  </section>;
}

function JournalTopicCard({ topic, index, open, onToggle, onAddEntry, onDeleteTopic, onDeleteEntry }: { topic: JournalTopic; index: number; open: boolean; onToggle: () => void; onAddEntry: (topicId: string, title: string, body: string) => void; onDeleteTopic: () => void; onDeleteEntry: (topicId: string, entryId: string) => void }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  function submit(event: React.FormEvent) { event.preventDefault(); if (!title.trim()) return; onAddEntry(topic.id, title, body); setTitle(""); setBody(""); }
  return <Reveal className="journal-topic" delay={index * 0.05}><div className="flex items-start gap-3"><button type="button" onClick={onToggle} className="flex min-w-0 flex-1 items-start gap-3 text-left"><span className="journal-number">{String(index + 1).padStart(2, "0")}</span><span className="min-w-0"><span className="block font-display text-2xl leading-tight">{topic.title}</span>{topic.description && <span className="mt-1 block text-sm leading-relaxed text-mist-900">{topic.description}</span>}<span className="mt-2 block font-mono text-[10px] uppercase tracking-widest text-signal">{topic.entries.length} {topic.entries.length === 1 ? "entrada" : "entradas"}</span></span></button><button type="button" onClick={onDeleteTopic} aria-label={`Eliminar tema ${topic.title}`} className="rounded-md p-2 text-mist-900 transition-colors hover:bg-red-500/10 hover:text-red-300"><Trash2 className="h-4 w-4" /></button></div>{open && <div className="mt-6 border-t border-white/10 pt-5"><div className="space-y-3">{topic.entries.map((entry) => <article key={entry.id} className="journal-entry"><div className="flex items-start justify-between gap-3"><div><h4 className="font-display text-lg">{entry.title}</h4><time className="font-mono text-[9px] uppercase tracking-widest text-mist-900">{new Date(entry.createdAt).toLocaleDateString("es-CO")}</time></div><button type="button" onClick={() => onDeleteEntry(topic.id, entry.id)} aria-label={`Eliminar entrada ${entry.title}`} className="text-mist-900 hover:text-red-300"><Trash2 className="h-3.5 w-3.5" /></button></div>{entry.body && <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-mist-900">{entry.body}</p>}</article>)}</div><form onSubmit={submit} className="mt-5 grid gap-2 md:grid-cols-[.7fr_1fr_auto]"><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título de la entrada" className="journal-input" /><input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Escribe una idea, hallazgo o decisión…" className="journal-input" /><button type="submit" className="magnetic-button magnetic-button-primary justify-center px-4 py-2.5">Añadir</button></form></div>}</Reveal>;
}

function BackToTop({ visible }: { visible: boolean }) {
  return <motion.button initial={false} animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : 18, pointerEvents: visible ? "auto" : "none" }} transition={{ duration: 0.25 }} aria-label="Volver al inicio" title="Volver al inicio" onClick={() => scrollToId("inicio")} className="back-to-top"><ArrowUp className="h-4 w-4" /></motion.button>;
}

function formatCompact(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString("es-CO");
}
