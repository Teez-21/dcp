"use client";

import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDashboardStore } from "@/store/useDashboardStore";
import { Election, colorOf, nameOf, ranking, sumVotes, locKey, locLabel } from "@/lib/electoral";
import { MapPin, Info } from "lucide-react";

const CARTO_KEY = "cb1_3vso_1_1dd6b9651234441adf3d9aef";
const DASHES = ["", "4 2", "1 3", "6 2 1 2", "2 2"];

function popupHTML(e: Election, votes: Record<string, number>, title: string, extra = ""): string {
  const rk = ranking(votes);
  const tot = sumVotes(votes);
  const rows = rk
    .map(([cid, v]) => {
      const pct = tot ? ((v / tot) * 100).toFixed(1) : "0.0";
      return `<tr><td><span class="row-dot" style="background:${colorOf(e, cid)}"></span>${escapeHtml(nameOf(e, cid))}</td><td>${fmtN(v)} · ${pct}%</td></tr>`;
    })
    .join("");
  return `<div class="dossier-pop"><h4>${escapeHtml(title)}</h4><div class="hint">${escapeHtml(e.name)}${extra}</div><table>${rows}<tr><td><b>Total</b></td><td><b>${fmtN(tot)}</b></td></tr></table></div>`;
}
const escapeHtml = (s: string) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
const fmtN = (n: number) => Number(n).toLocaleString("es-CO");
const uidL = () => "g" + Math.random().toString(36).slice(2, 9);

type LegendData = { election: Election; hint?: string }[];

export default function MapCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const LRef = useRef<any>(null);
  const layersRef = useRef<any[]>([]);
  const svgRef = useRef<any>(null);
  const defsRef = useRef<SVGDefsElement | null>(null);
  const prevGeo = useRef<unknown>(null);
  const prevPtsCount = useRef(0);

  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [legend, setLegend] = useState<LegendData>([]);
  const [legendHint, setLegendHint] = useState<string | null>(null);

  const elections = useDashboardStore((s) => s.elections);
  const visible = useDashboardStore((s) => s.visible);
  const mode = useDashboardStore((s) => s.mode);
  const opacity = useDashboardStore((s) => s.opacity);
  const geo = useDashboardStore((s) => s.geo);
  const nameProp = useDashboardStore((s) => s.nameProp);

  const getE = (id: string) => elections.find((e) => e.id === id);
  const primary = useMemo(() => {
    const id = visible[visible.length - 1];
    return id ? getE(id) : undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, elections]);

  // --- Inicializar el mapa una sola vez ---
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const leaflet = (await import("leaflet")).default;
      (window as any).L = leaflet;
      await import("leaflet.markercluster");
      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = leaflet.map(containerRef.current, {
        center: [4.65, -74.1],
        zoom: 11,
        zoomControl: true,
        preferCanvas: false,
      });
      leaflet
        .tileLayer(`https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=${CARTO_KEY}`, {
          attribution: "&copy; OpenStreetMap &copy; CARTO",
          maxZoom: 19,
        })
        .addTo(map);

      mapRef.current = map;
      LRef.current = leaflet;
      setReady(true);
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  function featName(props: Record<string, unknown> | null): string {
    return locKey((props || {})[nameProp || ""]);
  }
  function featLabel(props: Record<string, unknown> | null): string {
    const raw = (props || {})[nameProp || ""];
    const k = locKey(raw);
    return /^L\d+$/.test(k) ? locLabel(raw) : String(raw ?? "Sin nombre");
  }

  function clearLayers() {
    const map = mapRef.current;
    layersRef.current.forEach((l) => map.removeLayer(l));
    layersRef.current = [];
    if (svgRef.current) { map.removeLayer(svgRef.current); svgRef.current = null; defsRef.current = null; }
  }

  function addLocalidades(e: Election, L: any) {
    const map = mapRef.current;
    const svg = L.svg({ padding: 0.5 }).addTo(map);
    svgRef.current = svg;
    const svgEl: SVGSVGElement = svg._container;
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    svgEl.insertBefore(defs, svgEl.firstChild);
    defsRef.current = defs;

    const layer = L.geoJSON(geo, {
      renderer: svg,
      style: (f: any) => {
        const votes = e.localidades[featName(f.properties)];
        const rk = ranking(votes);
        const base = { color: getComputedStyle(document.documentElement).getPropertyValue("--fg").trim(), weight: 1.4, fillOpacity: 0.8 };
        if (!rk.length) return { ...base, fillColor: "#999", fillOpacity: 0.12, dashArray: "4 3" };
        if (mode === "winner") return { ...base, fillColor: colorOf(e, rk[0][0]) };
        const gid = "g-" + uidL();
        const tot = sumVotes(votes);
        let cum = 0, stops = "";
        rk.forEach(([cid, v]) => {
          const a = cum / tot, b = (cum + v) / tot, col = colorOf(e, cid);
          stops += `<stop offset="${a}" stop-color="${col}"/><stop offset="${b}" stop-color="${col}"/>`;
          cum += v;
        });
        const g = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
        g.setAttribute("id", gid); g.setAttribute("x1", "0"); g.setAttribute("x2", "1"); g.setAttribute("y1", "0"); g.setAttribute("y2", "0");
        g.innerHTML = stops;
        defsRef.current!.appendChild(g);
        return { ...base, fillColor: `url(#${gid})` };
      },
      onEachFeature: (f: any, l: any) => {
        const votes = e.localidades[featName(f.properties)];
        const label = featLabel(f.properties);
        l.bindTooltip(escapeHtml(label), { sticky: true });
        l.bindPopup(
          votes && ranking(votes).length
            ? popupHTML(e, votes, label)
            : `<div class="dossier-pop"><h4>${escapeHtml(label)}</h4><div class="hint">Sin datos de «${escapeHtml(e.name)}»</div></div>`
        );
        l.on("mouseover", () => l.setStyle({ weight: 3 }));
        l.on("mouseout", () => layer.resetStyle(l));
      },
    }).addTo(map);
    layersRef.current.push(layer);
  }

  function pointIcon(L: any, e: Election, votes: Record<string, number>, size: number, dashIdx: number, count: number) {
    const rk = ranking(votes);
    if (!rk.length) return L.divIcon({ html: "", className: "dp-icon", iconSize: [0, 0] });
    const op = opacity;
    const c1 = colorOf(e, rk[0][0]);
    const R = size / 2, dash = DASHES[dashIdx % DASHES.length];
    let inner = "";
    if (rk[1]) {
      const c2 = colorOf(e, rk[1][0]);
      const share = rk[1][1] / rk[0][1];
      const r2 = R * (0.3 + 0.35 * share);
      inner = `<circle cx="${R}" cy="${R}" r="${r2}" fill="${c2}" fill-opacity="${op}" stroke="${c2}" stroke-width="1.5"/>`;
    }
    const html =
      `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${R}" cy="${R}" r="${R - 1.5}" fill="${c1}" fill-opacity="${op}" stroke="${c1}" stroke-width="1.5" stroke-dasharray="${dash}"/>${inner}</svg>` +
      (count ? `<span class="cnt">${count}</span>` : "");
    return L.divIcon({ html, className: "dp-icon", iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
  }

  function addPuestos(e: Election, idx: number, L: any) {
    const map = mapRef.current;
    const pts = e.puestos.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
    if (!pts.length) return 0;
    const maxTot = Math.max(1, ...pts.map((p) => sumVotes(p.votes)));
    const group = L.markerClusterGroup({
      maxClusterRadius: 55,
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      iconCreateFunction: (cl: any) => {
        const agg: Record<string, number> = {};
        let n = 0;
        cl.getAllChildMarkers().forEach((m: any) => {
          n++;
          for (const k in m.options.votes) agg[k] = (agg[k] || 0) + m.options.votes[k];
        });
        const size = Math.min(76, Math.round(22 + 9 * Math.log2(1 + sumVotes(agg) / maxTot)));
        return pointIcon(L, e, agg, size, idx, n);
      },
    });
    pts.forEach((p) => {
      const size = Math.round(14 + 26 * Math.sqrt(sumVotes(p.votes) / maxTot));
      const m = L.marker([p.lat, p.lng], { icon: pointIcon(L, e, p.votes, size, idx, 0), votes: p.votes });
      m.bindTooltip(escapeHtml(p.name));
      m.bindPopup(popupHTML(e, p.votes, p.name, p.localidad ? " · " + escapeHtml(p.localidad) : ""));
      group.addLayer(m);
    });
    group.addTo(map);
    layersRef.current.push(group);
    return pts.length;
  }

  // --- Redibujar capas cuando cambian datos, filtros o modo ---
  useEffect(() => {
    if (!ready) return;
    const L = LRef.current;
    clearLayers();
    const vis = visible.map(getE).filter(Boolean) as Election[];

    if (!vis.length) {
      setNotice("Activa al menos una votación en el menú «Elecciones».");
    } else if (mode === "puestos") {
      let total = 0;
      vis.forEach((e) => { total += addPuestos(e, elections.indexOf(e), L); });
      setNotice(total ? null : "Aún no hay puestos con coordenadas. Impórtalos en «Cargar datos».");
    } else {
      if (!geo) setNotice("Carga el GeoJSON de las localidades de Bogotá en «Cargar datos» para ver este modo.");
      else { setNotice(null); if (primary) addLocalidades(primary, L); }
    }

    const shown = mode === "puestos" ? vis : primary ? [primary] : [];
    setLegend(shown.map((e) => ({ election: e })));
    setLegendHint(
      mode === "puestos"
        ? "Círculo grande: ganador · círculo pequeño: segundo lugar · tamaño según votos · número: puestos agrupados"
        : mode === "split"
        ? "Cada localidad se divide en franjas proporcionales a los votos"
        : null
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, visible, mode, opacity, geo, nameProp, elections, primary]);

  // --- Encuadrar automáticamente al cargar un GeoJSON nuevo ---
  useEffect(() => {
    if (!ready || !geo || geo === prevGeo.current) return;
    prevGeo.current = geo;
    try { mapRef.current.fitBounds(LRef.current.geoJSON(geo).getBounds()); } catch {}
  }, [ready, geo]);

  // --- Encuadrar cuando aparecen puestos geolocalizados nuevos ---
  const geocodedCount = useMemo(
    () => elections.reduce((acc, e) => acc + e.puestos.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng)).length, 0),
    [elections]
  );
  useEffect(() => {
    if (!ready || mode !== "puestos" || geocodedCount === 0 || geocodedCount === prevPtsCount.current) return;
    prevPtsCount.current = geocodedCount;
    const pts: [number, number][] = [];
    elections.forEach((e) => e.puestos.forEach((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng) && pts.push([p.lat!, p.lng!])));
    if (pts.length) try { mapRef.current.fitBounds(LRef.current.latLngBounds(pts).pad(0.05)); } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, mode, geocodedCount]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="absolute inset-0" />

      <AnimatePresence>
        {notice && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute left-1/2 top-5 z-[500] max-w-[80%] -translate-x-1/2 rounded-xl border border-border-soft bg-panel/90 px-4 py-2.5 text-center text-[12.5px] shadow-dossier-lg backdrop-blur-md"
          >
            <span className="mr-1.5 inline-block align-[-2px]"><Info className="inline h-3.5 w-3.5 text-accent" /></span>
            {notice}
          </motion.div>
        )}
      </AnimatePresence>

      {legend.length > 0 && (
        <motion.div
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute bottom-6 right-4 z-[500] max-h-[42%] max-w-[15.5rem] overflow-auto rounded-2xl border border-border-soft bg-panel/90 p-3.5 text-[12px] shadow-dossier-lg backdrop-blur-md"
        >
          {legend.map(({ election }) => (
            <div key={election.id} className="mb-2 last:mb-0">
              <b className="mb-1 flex items-center gap-1.5 font-display text-[13px]"><MapPin className="h-3 w-3 text-accent" />{election.name}</b>
              {election.candidates.length ? (
                election.candidates.map((c) => (
                  <div key={c.id} className="flex items-center gap-1.5 py-0.5">
                    <span className="h-2 w-2 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,.18)]" style={{ background: c.color }} />
                    {c.name}
                  </div>
                ))
              ) : (
                <div className="text-muted">Sin candidatos</div>
              )}
            </div>
          ))}
          {legendHint && <div className="mt-1.5 border-t border-border-soft pt-1.5 text-[11px] text-muted">{legendHint}</div>}
        </motion.div>
      )}
    </div>
  );
}
