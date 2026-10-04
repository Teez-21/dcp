import type { Metadata } from "next";
import { ArrowLeft, ArrowUpRight, Landmark, ScrollText, TrendingUp, UsersRound } from "lucide-react";

export const metadata: Metadata = {
  title: "Datos sobre el Concejo de Bogotá · Datos a tener en cuenta",
  description: "Lecturas de tendencia, proposiciones, bancadas formales e informales y proyectos de acuerdo del Concejo de Bogotá.",
};

const sections = [
  {
    number: "01",
    title: "Lecturas de tendencia",
    icon: TrendingUp,
    status: "Disponible en el mapa",
    text: "Explora los resultados de la elección del Concejo de Bogotá 2023–2027 por localidad, UPZ y puesto de votación.",
  },
  {
    number: "02",
    title: "Bancadas formales e informales",
    icon: UsersRound,
    status: "En preparación",
    text: "Un espacio para documentar composición, afinidades, alianzas y cambios, distinguiendo hechos verificables de lectura política.",
  },
  {
    number: "03",
    title: "Proposiciones",
    icon: ScrollText,
    status: "En preparación",
    text: "Seguimiento a proposiciones y debates con referencia a la fuente, fecha y estado de cada iniciativa.",
  },
  {
    number: "04",
    title: "Proyectos de acuerdo",
    icon: Landmark,
    status: "En preparación",
    text: "Registro de proyectos de acuerdo propuestos, sus temas, autores, trámites y resultados, una vez se integren fuentes documentales.",
  },
];

export default function ConcejoPage() {
  return (
    <main className="character-page council-page relative min-h-screen overflow-x-clip text-mist-100">
      <div className="grain pointer-events-none fixed inset-0 z-[1]" />
      <div className="character-glow pointer-events-none absolute inset-x-0 top-0 h-[34rem]" />
      <div className="container-wide relative z-10 mx-auto px-5 pb-16 pt-6 sm:px-8 md:px-12 md:pt-10">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-5">
          <a href="/#inicio" className="magnetic-button magnetic-button-ghost">
            <ArrowLeft className="h-4 w-4" /> Volver al inicio
          </a>
          <span className="character-meta-chip text-[10px] font-mono uppercase tracking-[.14em] text-mist-900">Bogotá · Concejo Distrital</span>
        </header>

        <section className="council-hero py-16 md:py-24">
          <p className="eyebrow text-signal">Módulo 01 · Seguimiento público</p>
          <h1 className="mt-5 max-w-5xl font-display text-[clamp(3rem,8vw,7rem)] font-semibold leading-[.9] tracking-[-.065em]">
            Datos sobre el<br /><span className="text-stroke text-mist-100">Concejo de Bogotá.</span>
          </h1>
          <p className="mt-7 max-w-3xl text-base leading-relaxed text-mist-900 md:text-lg">
            Lecturas de tendencia, proposiciones, bancadas formales e informales, proyectos de acuerdo propuestos, entre otros.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <a href="/?election=concejo#territorio" className="magnetic-button magnetic-button-primary">
              Ver votación del Concejo en el mapa <ArrowUpRight className="h-4 w-4" />
            </a>
            <span className="character-meta-chip self-center text-[11px] text-mist-900">Las secciones en preparación se completarán con fuentes verificables.</span>
          </div>
        </section>

        <section aria-label="Temas del Concejo" className="council-grid">
          {sections.map(({ number, title, icon: Icon, status, text }) => (
            <article key={number} className="council-card">
              <div className="flex items-start justify-between gap-4">
                <span className="font-mono text-xs text-signal">{number}</span>
                <Icon className="h-5 w-5 text-signal" strokeWidth={1.6} />
              </div>
              <p className="council-status">{status}</p>
              <h2 className="mt-4 font-display text-2xl leading-tight tracking-tight">{title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-mist-900">{text}</p>
            </article>
          ))}
        </section>

        <footer className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-mist-900">
          <p>Las interpretaciones políticas se publicarán con contexto y referencias documentales.</p>
          <a href="/#territorio" className="inline-flex items-center gap-2 text-signal transition-colors hover:text-white">
            Ir al mapa electoral <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </footer>
      </div>
    </main>
  );
}
