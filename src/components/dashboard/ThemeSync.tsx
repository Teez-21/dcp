"use client";

import { useEffect } from "react";
import { useDashboardStore } from "@/store/useDashboardStore";
import { applyBranding, DEFAULT_PALETTES, type BrandPalette } from "@/lib/branding";

export default function ThemeSync() {
  const theme = useDashboardStore((state) => state.theme);

  useEffect(() => {
    let palettes = DEFAULT_PALETTES;
    try {
      const saved = JSON.parse(window.localStorage.getItem("dcp-branding:v1") ?? "null") as { palettes?: BrandPalette[] } | null;
      if (saved?.palettes?.length) palettes = [...DEFAULT_PALETTES, ...saved.palettes.filter((palette) => palette.source === "custom")];
    } catch {
      // Si el almacenamiento está dañado, se conserva el catálogo predeterminado.
    }
    applyBranding(theme, palettes);
  }, [theme]);

  return null;
}
