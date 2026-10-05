// =====================================================================
// Modelo de datos y utilidades electorales.
// Puerto directo de la lógica ya validada de la versión HTML del
// dashboard: normalización de localidades, parseo de CSV de la
// Registraduría, colores de candidatos y agregación de votos.
// =====================================================================

export type Candidate = { id: string; name: string; color: string; party?: string };

export type Puesto = {
  id: string;
  zona?: number;
  num?: string;
  name: string;
  localidad: string;
  lat?: number;
  lng?: number;
  votes: Record<string, number>;
  partyVotes?: Record<string, number>;
};

export type Election = {
  id: string;
  name: string;
  dataVersion?: string;
  candidates: Candidate[];
  /** votos agregados por localidad, clave 'L1'..'L20' u otra normalizada */
  localidades: Record<string, Record<string, number>>;
  puestos: Puesto[];
  partyVotes?: Record<string, Record<string, number>>;
  /** Colores por partido, incluidos los partidos con sólo votos no preferentes de lista. */
  partyColors?: Record<string, string>;
  /** Para corporaciones como Concejo: muestra partidos por defecto y permite alternar a candidato. */
  partyMode?: boolean;
};

export type MapMode = "winner" | "split";
export type MarginMetric = "absolute" | "percentage";
export type ThemeName = "tokyo" | "solarized" | (string & {});

export const PALETTE = [
  "#2a9d8f", "#e9a800", "#457b9d", "#f4722b", "#43aa8b",
  "#8d99ae", "#b56576", "#264653", "#a68a64", "#5f7d4f",
];

// Colores semánticos para candidaturas y partidos que deben conservarse
// iguales entre elecciones, incluso cuando se importan desde un CSV.
export const PRESET_COLORS: [RegExp, string][] = [
  [/cepeda|petro|pacto historico|gustavo bolivar/, "#e9a800"],
  [/centro democratico|paloma .*valencia/, "#173f73"],
  [/espriella/, "#6b7280"],
  [/partido verde|alianza verde|claudia .*lopez/, "#2f8f46"],
  [/nuevo liberalismo|galan/, "#c8343d"],
  [/oviedo/, "#0e9ca8"],
];

export function presetColorFor(rawName: unknown): string | undefined {
  const normalized = norm(rawName);
  return PRESET_COLORS.find(([pattern]) => pattern.test(normalized))?.[1];
}

export const NON_CANDIDATES =
  /^(votos en blanco|votos nulos|votos no marcados|blanco|nulos|no marcados)$/;

export const LOC_NAMES: Record<number, string> = {
  1: "Usaquén", 2: "Chapinero", 3: "Santa Fe", 4: "San Cristóbal", 5: "Usme",
  6: "Tunjuelito", 7: "Bosa", 8: "Kennedy", 9: "Fontibón", 10: "Engativá",
  11: "Suba", 12: "Barrios Unidos", 13: "Teusaquillo", 14: "Los Mártires",
  15: "Antonio Nariño", 16: "Puente Aranda", 17: "La Candelaria",
  18: "Rafael Uribe Uribe", 19: "Ciudad Bolívar", 20: "Sumapaz",
};

export const norm = (s: unknown): string =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");

const LOC_CANON: [number, string][] = Object.entries(LOC_NAMES).map(
  ([n, name]) => [+n, norm(name).replace(/^(los|la)\s+/, "")]
);

/** 'L<número>' si el valor es una localidad de Bogotá; si no, el texto normalizado. */
export function locKey(v: unknown): string {
  const raw = String(v ?? "").trim();
  if (/^\d{1,2}$/.test(raw) && +raw >= 1 && +raw <= 20) return "L" + +raw;
  let c = norm(raw)
    .replace(/^localidad\s*/, "")
    .replace(/^\d+\s*/, "")
    .replace(/^(los|la|las|el)\s+/, "");
  if (c) {
    for (const [n, L] of LOC_CANON) {
      if (c === L || (c.length >= 5 && (L.startsWith(c) || c.startsWith(L)))) return "L" + n;
    }
  }
  return norm(raw);
}

export const locLabel = (v: unknown): string => {
  const k = locKey(v);
  return /^L\d+$/.test(k) ? LOC_NAMES[+k.slice(1)] : String(v ?? "Sin nombre");
};

export const titleCase = (s: string): string =>
  s
    .toLowerCase()
    .replace(/(^|\s)([a-záéíóúñü])/g, (_m, a, b) => a + b.toUpperCase())
    .replace(/\b(De|Del|La|Las|Los|Y)\b/g, (w) => w.toLowerCase())
    .replace(/^./, (c) => c.toUpperCase());

export const uid = (): string => "x" + Math.random().toString(36).slice(2, 9);

export function ranking(votes: Record<string, number> | undefined): [string, number][] {
  return Object.entries(votes || {})
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);
}

export const sumVotes = (v: Record<string, number> | undefined): number =>
  Object.values(v || {}).reduce((a, b) => a + b, 0);

export function newElection(id: string, name: string): Election {
  return { id, name, candidates: [], localidades: {}, puestos: [] };
}

export function candOf(e: Election, cid: string): Candidate | undefined {
  return e.candidates.find((c) => c.id === cid);
}
export const colorOf = (e: Election, cid: string): string => {
  const candidate = candOf(e, cid);
  return presetColorFor(candidate?.name) ?? candidate?.color ?? "#888";
};
export const nameOf = (e: Election, cid: string): string => candOf(e, cid)?.name ?? cid;

export type ResultView = "party" | "candidate";

export function partyOf(e: Election, cid: string): string {
  return candOf(e, cid)?.party || nameOf(e, cid);
}

/** Agrupa votos por partido solo en elecciones configuradas con partyMode. */
export function displayVotes(e: Election, votes: Record<string, number> | undefined, view: ResultView = "candidate"): Record<string, number> {
  if (!votes || !e.partyMode || view === "candidate") return votes || {};
  const grouped: Record<string, number> = {};
  for (const [cid, value] of Object.entries(votes)) {
    const party = partyOf(e, cid);
    grouped[party] = (grouped[party] || 0) + value;
  }
  return grouped;
}

export function displayLocalityVotes(e: Election, locality: string, view: ResultView = "candidate"): Record<string, number> {
  const grouped = displayVotes(e, e.localidades[locality], view);
  if (!e.partyMode || view === "candidate") return grouped;
  for (const [party, value] of Object.entries(e.partyVotes?.[locality] || {})) grouped[party] = (grouped[party] || 0) + value;
  return grouped;
}

export function displayPuestoVotes(e: Election, puesto: Puesto, view: ResultView = "candidate"): Record<string, number> {
  const grouped = displayVotes(e, puesto.votes, view);
  if (!e.partyMode || view === "candidate") return grouped;
  for (const [party, value] of Object.entries(puesto.partyVotes || {})) grouped[party] = (grouped[party] || 0) + value;
  return grouped;
}

export function displayColor(e: Election, key: string, view: ResultView = "candidate"): string {
  if (!e.partyMode || view === "candidate") return colorOf(e, key);
  const preset = presetColorFor(key);
  if (preset) return preset;
  const partyColor = e.partyColors?.[key];
  if (partyColor) return partyColor;
  const candidate = e.candidates.find((c) => c.party === key);
  return candidate?.color ?? "#888";
}

export function displayName(e: Election, key: string, view: ResultView = "candidate"): string {
  return e.partyMode && view === "party" ? key : nameOf(e, key);
}

/** Crea o reutiliza un candidato dentro de una elección, asignando color fijo o de paleta. */
export function ensureCand(e: Election, rawName: string): Candidate {
  const existing = e.candidates.find((x) => norm(x.name) === norm(rawName));
  if (existing) {
    const preset = presetColorFor(existing.name);
    if (preset) existing.color = preset;
    return existing;
  }
  const preset = presetColorFor(rawName);
  const used = e.candidates.filter((x) => !PRESET_COLORS.some(([, col]) => col === x.color)).length;
  const nm = rawName === rawName.toUpperCase() ? titleCase(rawName.trim()) : rawName.trim();
  const c: Candidate = { id: uid(), name: nm, color: preset ?? PALETTE[used % PALETTE.length] };
  e.candidates.push(c);
  return c;
}

// ---------- CSV ----------

export type CsvRow = Record<string, string | undefined>;

/** Parser de CSV tolerante a comillas, que detecta coma o punto y coma. */
export function parseCSV(text: string): CsvRow[] {
  const clean = text.replace(/^\uFEFF/, "");
  const lines = clean.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) throw new Error("el CSV no tiene filas");
  const d = lines[0].split(";").length > lines[0].split(",").length ? ";" : ",";
  const split = (l: string): string[] => {
    const out: string[] = [];
    let cur = "", q = false;
    for (let i = 0; i < l.length; i++) {
      const ch = l[i];
      if (ch === '"') {
        if (q && l[i + 1] === '"') { cur += '"'; i++; } else q = !q;
      } else if (ch === d && !q) { out.push(cur); cur = ""; } else cur += ch;
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };
  const head = split(lines[0]).map(norm);
  return lines.slice(1).map((l) => {
    const c = split(l), o: CsvRow = {};
    head.forEach((h, i) => (o[h] = c[i]));
    return o;
  });
}

export const pick = (o: CsvRow, ...keys: string[]): string | undefined => {
  for (const k of keys) if (o[k] !== undefined && o[k] !== "") return o[k];
  return undefined;
};
export const toVotes = (s: unknown): number => parseInt(String(s ?? "0").replace(/[.\s,]/g, ""), 10) || 0;
export const toCoord = (s: unknown): number => parseFloat(String(s ?? "").replace(",", "."));

export const puestoKey = (v: unknown): string => {
  const s = String(v ?? "").trim();
  return /^\d+$/.test(s) ? String(+s) : s.toUpperCase();
};

export const simpleName = (s: string): string =>
  norm(s)
    .replace(/\b(col|colegio|ied|dist|distrital|univ|universidad|sede|jardin|inf|esc|escuela|de|del|la|el|los|las)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

// ---------- GeoJSON ----------

export type GeoFeature = { type: "Feature"; properties: Record<string, unknown> | null; geometry: unknown };
export type GeoFC = { type: "FeatureCollection"; features: GeoFeature[] };

/** Valida y detecta el campo de nombre de localidad. Lanza si no parece la capa correcta. */
export function loadLocalidadesGeoJSON(raw: unknown): { fc: GeoFC; nameProp: string } {
  const g = raw as { type?: string; features?: GeoFeature[] };
  const fc: GeoFC | null =
    g.type === "FeatureCollection"
      ? (g as GeoFC)
      : g.type === "Feature"
      ? { type: "FeatureCollection", features: [g as unknown as GeoFeature] }
      : null;
  if (!fc || !fc.features.length) throw new Error("no es un GeoJSON de polígonos");

  const keys = Object.keys(fc.features[0].properties || {});
  let best = "", bestScore = 0;
  keys.forEach((k) => {
    const hit = new Set<string>();
    fc.features.forEach((f) => {
      const v = locKey((f.properties || {})[k]);
      if (/^L\d+$/.test(v)) hit.add(v);
    });
    if (hit.size > bestScore) { bestScore = hit.size; best = k; }
  });

  if (fc.features.length > 400 || bestScore < 15) {
    throw new Error(
      `este archivo tiene ${fc.features.length.toLocaleString("es-CO")} polígonos y solo reconozco ${bestScore} localidades en sus campos (${keys.join(", ")}). Parece una capa de manzanas o sectores. Necesito la capa de localidades de Bogotá: 20 polígonos con el nombre o número de la localidad.`
    );
  }
  return { fc, nameProp: best };
}

// ---------- Formato ----------
export const fmt = (n: number): string => Number(n).toLocaleString("es-CO");
