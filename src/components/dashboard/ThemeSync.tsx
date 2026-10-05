"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useDashboardStore } from "@/store/useDashboardStore";
import { applyBranding, DEFAULT_PALETTES, type BrandPalette } from "@/lib/branding";
import { getSupabaseClient } from "@/lib/supabase";

export default function ThemeSync() {
  const theme = useDashboardStore((state) => state.theme);
  const setTheme = useDashboardStore((state) => state.setTheme);
  const client = useMemo(() => getSupabaseClient(), []);
  const [remoteReady, setRemoteReady] = useState(!client);
  const loadedRemote = useRef(false);

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

  useEffect(() => {
    if (!client || loadedRemote.current) return;
    loadedRemote.current = true;
    let cancelled = false;
    client.from("site_theme").select("theme").eq("id", "global").maybeSingle().then(({ data, error }) => {
      if (error) console.warn("No se pudo cargar el tema global desde Supabase.", error.message);
      if (!cancelled && data?.theme) setTheme(data.theme);
      if (!cancelled) setRemoteReady(true);
    });
    return () => { cancelled = true; };
  }, [client, setTheme]);

  useEffect(() => {
    if (!client || !remoteReady) return;
    client.from("site_theme").upsert({ id: "global", theme, updated_at: new Date().toISOString() }, { onConflict: "id" })
      .then(({ error }) => { if (error) console.warn("No se pudo guardar el tema global en Supabase.", error.message); });
  }, [client, remoteReady, theme]);

  return null;
}
