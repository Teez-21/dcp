export type PaletteRole = "Principal" | "Fondo" | "Acción" | "Texto" | "Secundario" | "Apoyo" | "Énfasis" | "Neutro" | "Superficie" | "Borde";

export const PALETTE_ROLES: PaletteRole[] = ["Principal", "Secundario", "Fondo", "Superficie", "Acción", "Texto", "Apoyo", "Énfasis", "Borde", "Neutro"];

export type BrandColor = {
  hex: string;
  role: PaletteRole;
};

export type BrandPalette = {
  id: string;
  name: string;
  description: string;
  recommendation?: string;
  colors: BrandColor[];
  source: "default" | "custom";
};

export const BRAND_STORAGE_KEY = "dcp-branding:v1";
export const DASHBOARD_STORAGE_KEY = "datos-a-tener-en-cuenta:v1";

export const DEFAULT_PALETTES: BrandPalette[] = [
  {
    id: "palette-1",
    name: "Paleta 1 · Rojo / blanco",
    description: "Contraste directo y alta recordación para una identidad pública, clara y contundente.",
    colors: [
      { hex: "#B3262E", role: "Principal" },
      { hex: "#7E1A22", role: "Secundario" },
      { hex: "#FAF8F5", role: "Fondo" },
      { hex: "#F1D9D8", role: "Énfasis" },
      { hex: "#1F2328", role: "Texto" },
      { hex: "#5B616B", role: "Apoyo" },
      { hex: "#E8E4DE", role: "Neutro" },
      { hex: "#FFFFFF", role: "Fondo" },
    ],
    source: "default",
  },
  {
    id: "palette-2",
    name: "Paleta 2 · Púrpura",
    description: "Una lectura institucional, contemporánea y editorial alrededor del púrpura.",
    colors: [
      { hex: "#5B3A8C", role: "Principal" },
      { hex: "#3A2360", role: "Secundario" },
      { hex: "#B9A8D6", role: "Apoyo" },
      { hex: "#EFEAF6", role: "Fondo" },
      { hex: "#1E1B26", role: "Texto" },
      { hex: "#5E5A6B", role: "Neutro" },
      { hex: "#D6B25E", role: "Énfasis" },
      { hex: "#FFFFFF", role: "Fondo" },
    ],
    source: "default",
  },
  {
    id: "palette-3",
    name: "Paleta 3 · Naranja",
    description: "Cálida y accesible; pensada para educación, cultura y conversación ciudadana.",
    colors: [
      { hex: "#EE6C1F", role: "Principal" },
      { hex: "#F7A13B", role: "Secundario" },
      { hex: "#B5441B", role: "Acción" },
      { hex: "#FFF3E3", role: "Fondo" },
      { hex: "#26275E", role: "Texto" },
      { hex: "#1C9C9A", role: "Apoyo" },
      { hex: "#D63A74", role: "Énfasis" },
      { hex: "#FFFFFF", role: "Fondo" },
    ],
    source: "default",
  },
  {
    id: "palette-5",
    name: "Paleta 5 · Aguamarina / rojo",
    description: "Equilibrio entre confianza, frescura y un acento de alerta para destacar decisiones.",
    recommendation: "Principal 45% · Fondo 35% · Acción 15% · Énfasis 5%",
    colors: [
      { hex: "#0E9CA8", role: "Principal" },
      { hex: "#0A4F5C", role: "Secundario" },
      { hex: "#FAF8F5", role: "Fondo" },
      { hex: "#D93A3F", role: "Acción" },
      { hex: "#0F2A33", role: "Texto" },
      { hex: "#E3F4F5", role: "Apoyo" },
      { hex: "#8F1F2B", role: "Énfasis" },
      { hex: "#F6D5D2", role: "Neutro" },
    ],
    source: "default",
  },
  {
    id: "palette-6",
    name: "Paleta 6 · Naranja / rojo",
    description: "Energética y visible; combina impulso, urgencia y una base cálida para campañas.",
    recommendation: "Principal 40% · Fondo 35% · Acción 20% · Énfasis 5%",
    colors: [
      { hex: "#F37021", role: "Principal" },
      { hex: "#232A4D", role: "Secundario" },
      { hex: "#D0243A", role: "Acción" },
      { hex: "#FFF6EC", role: "Fondo" },
      { hex: "#151A2E", role: "Texto" },
      { hex: "#5C6378", role: "Apoyo" },
      { hex: "#8E1B2E", role: "Énfasis" },
      { hex: "#FBB040", role: "Neutro" },
    ],
    source: "default",
  },
];

export const DEFAULT_THEME = "tokyo";

export function getPaletteById(id: string | undefined, palettes = DEFAULT_PALETTES) {
  return palettes.find((palette) => palette.id === id);
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  const value = normalized.length === 3 ? normalized.split("").map((part) => part + part).join("") : normalized;
  const number = Number.parseInt(value, 16);
  return { r: (number >> 16) & 255, g: (number >> 8) & 255, b: number & 255 };
}

export function rgba(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgb(${r} ${g} ${b} / ${alpha})`;
}

function contrastColor(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62 ? "#17131c" : "#fffaf5";
}

export function applyBranding(theme: string, palettes = DEFAULT_PALETTES) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const palette = getPaletteById(theme, palettes);
  root.dataset.theme = theme;
  if (!palette) {
    root.style.removeProperty("--brand-primary");
    return;
  }

  const colors = palette.colors;
  const colorFor = (role: PaletteRole, fallback: string) => colors.find((color) => color.role === role)?.hex ?? fallback;
  const principal = colorFor("Principal", colors[0].hex);
  const secondary = colorFor("Secundario", principal);
  const background = colorFor("Fondo", "#080812");
  const surface = colorFor("Superficie", background);
  const action = colorFor("Acción", principal);
  const text = colorFor("Texto", "#f8fafc");
  const support = colorFor("Apoyo", secondary);
  const highlight = colorFor("Énfasis", support);
  const border = colorFor("Borde", principal);
  root.style.setProperty("--brand-primary", principal);
  root.style.setProperty("--brand-secondary", secondary);
  root.style.setProperty("--brand-bg", background);
  root.style.setProperty("--brand-surface", surface);
  root.style.setProperty("--brand-action", action);
  root.style.setProperty("--brand-text", text);
  root.style.setProperty("--brand-support", support);
  root.style.setProperty("--brand-highlight", highlight);
  root.style.setProperty("--brand-border", border);
  root.style.setProperty("--accent", principal);
  root.style.setProperty("--accent2", support);
  root.style.setProperty("--accent-ink", action);
  root.style.setProperty("--on-accent", contrastColor(action));
  root.style.setProperty("--border", rgba(border, 0.38));
  root.style.setProperty("--border-soft", rgba(border, 0.18));
  root.style.setProperty("--fg", text);
  root.style.setProperty("--muted", rgba(text, 0.7));
  root.style.setProperty("--faint", rgba(text, 0.48));
  root.style.setProperty("--bg", background);
  root.style.setProperty("--panel", surface);
  root.style.setProperty("--panel-soft", rgba(surface, 0.84));
  root.style.setProperty("--panel-2", rgba(principal, 0.16));
  for (let index = 0; index < 7; index += 1) {
    root.style.setProperty(`--c${index + 1}`, colors[index % colors.length].hex);
  }
}
