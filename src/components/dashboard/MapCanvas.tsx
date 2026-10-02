"use client";

import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDashboardStore } from "@/store/useDashboardStore";
import { Election, GeoFC, ranking, sumVotes, locKey, locLabel, ResultView, displayColor, displayLocalityVotes, displayName, displayPuestoVotes } from "@/lib/electoral";
import { pollingStationSummary, stationForPuesto } from "@/lib/pollingStations";
import { MapPin, Info } from "lucide-react";

const CARTO_KEY = "cb1_3vso_1_1dd6b9651234441adf3d9aef";
const DASHES = ["", "4 2", "1 3", "6 2 1 2", "2 2"];

function popupHTML(e: Election, votes: Record<string, number>, title: string, extra = "", view: ResultView = "candidate"): string {
  const rk = ranking(votes);
  const tot = sumVotes(votes);
  const rows = rk
    .map(([cid, v]) => {
      const pct = tot ? ((v / tot) * 100).toFixed(1) : "0.0";
      return `<tr><td><span class="row-dot" style="background:${displayColor(e, cid, view)}"></span>${escapeHtml(displayName(e, cid, view))}</td><td>${fmtN(v)} · ${pct}%</td></tr>`;
    })
    .join("");
  return `<div class="dossier-pop"><h4>${escapeHtml(title)}</h4><div class="hint">${escapeHtml(e.name)}${extra}</div><table>${rows}<tr><td><b>Total</b></td><td><b>${fmtN(tot)}</b></td></tr></table></div>`;
}
const escapeHtml = (s: string) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
const fmtN = (n: number) => Number(n).toLocaleString("es-CO");
const uidL = () => "g" + Math.random().toString(36).slice(2, 9);
const marginValue = (votes: Record<string, number>, metric: "absolute" | "percentage") => {
  const ranked = ranking(votes);
  if (!ranked.length) return 0;
  const difference = ranked[0][1] - (ranked[1]?.[1] || 0);
  return metric === "absolute" ? difference : (sumVotes(votes) ? difference / sumVotes(votes) : 0);
};

type LegendData = { election: Election; hint?: string }[];

async function fetchFeatureCollection(path: string): Promise<GeoFC> {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`No se pudo cargar ${path}`);
  const data = await response.json() as GeoFC;
  if (data?.type !== "FeatureCollection" || !Array.isArray(data.features)) {
    throw new Error("La capa geográfica no tiene un GeoJSON válido.");
  }
  return data;
}

export default function MapCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const LRef = useRef<any>(null);
  const layersRef = useRef<any[]>([]);
  const svgRef = useRef<any>(null);
  const defsRef = useRef<SVGDefsElement | null>(null);
  const fittedLayerRef = useRef<string | null>(null);
  const upzLoadStarted = useRef(false);

  const [ready, setReady] = useState(false);
  const [localitiesGeo, setLocalitiesGeo] = useState<GeoFC | null>(null);
  const [upzGeo, setUpzGeo] = useState<GeoFC | null>(null);
  const [localitiesError, setLocalitiesError] = useState<string | null>(null);
  const [upzError, setUpzError] = useState<string | null>(null);
  const [upzLoading, setUpzLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [legend, setLegend] = useState<LegendData>([]);
  const [legendHint, setLegendHint] = useState<string | null>(null);

  const elections = useDashboardStore((s) => s.elections);
  const visible = useDashboardStore((s) => s.visible);
  const mode = useDashboardStore((s) => s.mode);
  const opacity = useDashboardStore((s) => s.opacity);
  const marginMetric = useDashboardStore((s) => s.marginMetric);
  const territoryLevel = useDashboardStore((s) => s.territoryLevel);
  const resultViewByElection = useDashboardStore((s) => s.resultViewByElection);

  const getE = (id: string) => elections.find((e) => e.id === id);

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

  useEffect(() => {
    let cancelled = false;
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    fetchFeatureCollection(`${basePath}/data/localidades.geojson`)
      .then((collection) => { if (!cancelled) setLocalitiesGeo(collection); })
      .catch((error: unknown) => { if (!cancelled) setLocalitiesError(error instanceof Error ? error.message : "No se pudo cargar la capa de localidades."); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (territoryLevel !== "upz" || upzGeo || upzLoadStarted.current) return;
    upzLoadStarted.current = true;
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    setUpzLoading(true);
    fetchFeatureCollection(`${basePath}/data/upz-localidades.geojson`)
      .then((collection) => { setUpzGeo(collection); })
      .catch((error: unknown) => {
        upzLoadStarted.current = false;
        setUpzError(error instanceof Error ? error.message : "No se pudo cargar la capa de UPZ.");
      })
      .finally(() => { setUpzLoading(false); });
  }, [territoryLevel, upzGeo]);

  function localityKey(props: Record<string, unknown> | null): string {
    return locKey((props || {}).NOMBRE_LOCALIDAD ?? (props || {}).CODIGO_LOCALIDAD);
  }
  function localityLabel(props: Record<string, unknown> | null): string {
    return locLabel((props || {}).NOMBRE_LOCALIDAD ?? (props || {}).CODIGO_LOCALIDAD);
  }
  function upzLabel(props: Record<string, unknown> | null): string {
    const code = String((props || {}).CODIGO_UPZ ?? "");
    const name = String((props || {}).NOMBRE ?? "UPZ sin nombre");
    return `${code ? `UPZ ${code} · ` : ""}${name}`;
  }

  function clearLayers() {
    const map = mapRef.current;
    layersRef.current.forEach((l) => map.removeLayer(l));
    layersRef.current = [];
    if (svgRef.current) { map.removeLayer(svgRef.current); svgRef.current = null; defsRef.current = null; }
  }

  function ensureSvgRenderer(L: any) {
    if (svgRef.current) return svgRef.current;
    const svg = L.svg({ padding: 0.5 }).addTo(mapRef.current);
    svgRef.current = svg;
    const svgEl: SVGSVGElement = svg._container;
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    svgEl.insertBefore(defs, svgEl.firstChild);
    defsRef.current = defs;
    return svg;
  }

  function addLocalidades(e: Election, L: any, geoData: GeoFC) {
    const map = mapRef.current;
    const view = resultViewByElection?.[e.id] || "candidate";
    const svg = ensureSvgRenderer(L);

    const layer = L.geoJSON(geoData, {
      renderer: svg,
      style: (f: any) => {
        const votes = displayLocalityVotes(e, localityKey(f.properties), view);
        const rk = ranking(votes);
        const base = { color: getComputedStyle(document.documentElement).getPropertyValue("--fg").trim(), weight: 1.25, opacity: 0.78, fillOpacity: opacity };
        if (!rk.length) return { ...base, fillColor: "#999", fillOpacity: 0.12, dashArray: "4 3" };
        if (mode === "winner") return { ...base, fillColor: displayColor(e, rk[0][0], view) };
        const gid = "g-" + uidL();
        const tot = sumVotes(votes);
        let cum = 0, stops = "";
        rk.forEach(([cid, v]) => {
          const a = cum / tot, b = (cum + v) / tot, col = displayColor(e, cid, view);
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
        const votes = displayLocalityVotes(e, localityKey(f.properties), view);
        const label = localityLabel(f.properties);
        l.bindTooltip(escapeHtml(label), { sticky: true });
        l.bindPopup(
          votes && ranking(votes).length
            ? popupHTML(e, votes, label, "", view)
            : `<div class="dossier-pop"><h4>${escapeHtml(label)}</h4><div class="hint">Sin datos de «${escapeHtml(e.name)}»</div></div>`
        );
        l.on("mouseover", () => l.setStyle({ weight: 3 }));
        l.on("mouseout", () => layer.resetStyle(l));
      },
    }).addTo(map);
    layersRef.current.push(layer);
  }

  function upzVotesForElection(e: Election, view: ResultView): Record<string, Record<string, number>> {
    const totals: Record<string, Record<string, number>> = {};
    e.puestos.forEach((puesto) => {
      const station = stationForPuesto(puesto);
      if (!station?.upz_code) return;
      const votes = displayPuestoVotes(e, puesto, view);
      if (!ranking(votes).length) return;
      const target = totals[station.upz_code] || (totals[station.upz_code] = {});
      Object.entries(votes).forEach(([candidate, count]) => {
        target[candidate] = (target[candidate] || 0) + count;
      });
    });
    return totals;
  }

  function addUpz(e: Election, L: any, geoData: GeoFC) {
    const map = mapRef.current;
    const view = resultViewByElection?.[e.id] || "candidate";
    const votesByUpz = upzVotesForElection(e, view);
    const svg = ensureSvgRenderer(L);
    const layer = L.geoJSON(geoData, {
      renderer: svg,
      style: (feature: any) => {
        const props = feature.properties || {};
        const code = String(props.CODIGO_UPZ ?? "");
        const stationCount = Number(props.PUESTOS_GEOJSON_COUNT ?? 0);
        const votes = votesByUpz[code] || {};
        const ranked = ranking(votes);
        const base = { color: getComputedStyle(document.documentElement).getPropertyValue("--fg").trim(), weight: 1.05, opacity: 0.8, fillOpacity: opacity };
        if (!stationCount) return { ...base, color: "#626a78", fillColor: "#858b99", weight: 1.15, fillOpacity: Math.max(0.72, opacity) };
        if (!ranked.length) return { ...base, fillColor: "#8b93a0", fillOpacity: 0.12, dashArray: "4 3" };
        if (mode === "winner") return { ...base, fillColor: displayColor(e, ranked[0][0], view) };

        const gid = "g-" + uidL();
        const total = sumVotes(votes);
        let cumulative = 0, stops = "";
        ranked.forEach(([candidate, count]) => {
          const start = cumulative / total, end = (cumulative + count) / total;
          const color = displayColor(e, candidate, view);
          stops += `<stop offset="${start}" stop-color="${color}"/><stop offset="${end}" stop-color="${color}"/>`;
          cumulative += count;
        });
        const gradient = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
        gradient.setAttribute("id", gid); gradient.setAttribute("x1", "0"); gradient.setAttribute("x2", "1"); gradient.setAttribute("y1", "0"); gradient.setAttribute("y2", "0");
        gradient.innerHTML = stops;
        defsRef.current!.appendChild(gradient);
        return { ...base, fillColor: `url(#${gid})` };
      },
      onEachFeature: (feature: any, featureLayer: any) => {
        const props = feature.properties || {};
        const code = String(props.CODIGO_UPZ ?? "");
        const label = upzLabel(props);
        const locality = String(props.NOMBRE_LOCALIDAD || "Localidad sin asignar");
        const stationCount = Number(props.PUESTOS_GEOJSON_COUNT ?? 0);
        const votes = votesByUpz[code] || {};
        const ranked = ranking(votes);
        featureLayer.bindTooltip(`${escapeHtml(label)} · ${stationCount} puesto${stationCount === 1 ? "" : "s"}`, { sticky: true });
        featureLayer.bindPopup(
          !stationCount
            ? `<div class="dossier-pop"><h4>${escapeHtml(label)}</h4><div class="hint">${escapeHtml(locality)}</div><p>Sin puestos de votación en la fuente geográfica; esta UPZ aparece en gris.</p></div>`
            : ranked.length
              ? popupHTML(e, votes, label, ` · ${stationCount} puestos · ${escapeHtml(locality)}`, view)
              : `<div class="dossier-pop"><h4>${escapeHtml(label)}</h4><div class="hint">${escapeHtml(locality)} · ${stationCount} puestos</div><p>Sin resultados para esta elección.</p></div>`
        );
        featureLayer.on("mouseover", () => featureLayer.setStyle({ weight: 2.6 }));
        featureLayer.on("mouseout", () => layer.resetStyle(featureLayer));
      },
    }).addTo(map);
    layersRef.current.push(layer);
  }

  function addTerritoryBoundaries(geoData: GeoFC, L: any, level: "localidades" | "upz", emphasize = false) {
    const map = mapRef.current;
    const stroke = level === "upz" ? "#b89afc" : "#b5c3d5";
    const layer = L.geoJSON(geoData, {
      style: (feature: any) => ({
        color: stroke,
        weight: level === "upz" ? 0.85 : 1.1,
        opacity: 0.9,
        fillColor: stroke,
        fillOpacity: emphasize ? 0.13 : 0.025,
        dashArray: level === "upz" && String(feature?.properties?.ESTADO_CRUCE || "").toLowerCase().includes("parcial") ? "3 2" : undefined,
      }),
      onEachFeature: (feature: any, featureLayer: any) => {
        const props = feature.properties || {};
        const title = level === "upz" ? upzLabel(props) : localityLabel(props);
        const locality = level === "upz" ? String(props.NOMBRE_LOCALIDAD || "Localidad no asignada") : "Bogotá D.C.";
        const note = level === "upz" ? `${Number(props.PUESTOS_GEOJSON_COUNT ?? 0)} puestos georreferenciados.` : "Límite de localidad.";
        featureLayer.bindTooltip(escapeHtml(title), { sticky: true });
        featureLayer.bindPopup(`<div class="dossier-pop"><h4>${escapeHtml(title)}</h4><div class="hint">${escapeHtml(locality)}</div><p>${escapeHtml(note)}</p></div>`);
        featureLayer.on("mouseover", () => featureLayer.setStyle({ weight: level === "upz" ? 2.2 : 2.6 }));
        featureLayer.on("mouseout", () => layer.resetStyle(featureLayer));
      },
    }).addTo(map);
    layersRef.current.push(layer);
  }

  function pointIcon(L: any, e: Election, votes: Record<string, number>, size: number, dashIdx: number, count: number, view: ResultView = "candidate") {
    const rk = ranking(votes);
    if (!rk.length) return L.divIcon({ html: "", className: "dp-icon", iconSize: [0, 0] });
    const op = opacity;
    const c1 = displayColor(e, rk[0][0], view);
    const R = size / 2, dash = DASHES[dashIdx % DASHES.length];
    let inner = "";
    if (rk[1]) {
      const c2 = displayColor(e, rk[1][0], view);
      const r2 = R * 0.4;
      inner = `<circle cx="${R}" cy="${R}" r="${r2}" fill="${c2}" fill-opacity="${op}" stroke="${c2}" stroke-width="1.25" stroke-opacity="${op}"/>`;
    }
    const html =
      `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${R}" cy="${R}" r="${R - 1.5}" fill="${c1}" fill-opacity="${op}" stroke="${c1}" stroke-width="1.5" stroke-opacity="${op}" stroke-dasharray="${dash}"/>${inner}</svg>` +
      (count ? `<span class="cnt">${count}</span>` : "");
    return L.divIcon({ html, className: "dp-icon", iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
  }

  function addPuestos(e: Election, idx: number, L: any, maxMargin: number) {
    const map = mapRef.current;
    const view = resultViewByElection?.[e.id] || "candidate";
    const pts = e.puestos.flatMap((puesto) => {
      const station = stationForPuesto(puesto);
      const lat = Number.isFinite(puesto.lat) ? puesto.lat : station?.latitude;
      const lng = Number.isFinite(puesto.lng) ? puesto.lng : station?.longitude;
      return Number.isFinite(lat) && Number.isFinite(lng)
        ? [{ puesto, station, lat: Number(lat), lng: Number(lng) }]
        : [];
    });
    if (!pts.length) return 0;
    const sizeForVotes = (votes: Record<string, number>) => {
      const margin = marginValue(votes, marginMetric);
      const scaled = maxMargin > 0 ? Math.min(1, margin / maxMargin) : 0;
      return Math.round(16 + 38 * Math.sqrt(scaled));
    };
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
        const size = sizeForVotes(agg);
        return pointIcon(L, e, agg, size, idx, n, view);
      },
    });
    pts.forEach(({ puesto, station, lat, lng }) => {
      const votes = displayPuestoVotes(e, puesto, view);
      const size = sizeForVotes(votes);
      const marker = L.marker([lat, lng], { icon: pointIcon(L, e, votes, size, idx, 0, view), votes });
      const locality = puesto.localidad || station?.locality_name || "Localidad sin dato";
      const place = station?.upz_code ? `UPZ ${station.upz_code} · ${station.upz_name}` : station ? "Fuera de los polígonos UPZ" : "Coordenada manual";
      const margin = marginValue(votes, marginMetric);
      const marginLabel = marginMetric === "absolute" ? `${fmtN(margin)} votos` : `${(margin * 100).toFixed(1)}%`;
      marker.bindTooltip(`${escapeHtml(puesto.name)} · ${escapeHtml(place)}`);
      marker.bindPopup(popupHTML(e, votes, puesto.name, ` · ${escapeHtml(locality)} · ${escapeHtml(place)} · Ventaja: ${marginLabel}`, view));
      group.addLayer(marker);
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
    const outsideWithVotes = new Set<string>();
    vis.forEach((e) => {
      const view = resultViewByElection?.[e.id] || "candidate";
      e.puestos.forEach((puesto) => {
        const station = stationForPuesto(puesto);
        if (station && !station.upz_code && sumVotes(displayPuestoVotes(e, puesto, view)) > 0) outsideWithVotes.add(station.station_key);
      });
    });

    if (!vis.length) {
      setNotice("Activa al menos una votación en el menú «Elecciones».");
    } else if (territoryLevel === "puestos") {
      if (localitiesGeo) addTerritoryBoundaries(localitiesGeo, L, "localidades", false);
      const margins = vis.flatMap((e) => {
        const view = resultViewByElection?.[e.id] || "candidate";
        return e.puestos.flatMap((puesto) => {
          const station = stationForPuesto(puesto);
          const hasCoordinates = Number.isFinite(puesto.lat) && Number.isFinite(puesto.lng) || Boolean(station);
          return hasCoordinates ? [marginValue(displayPuestoVotes(e, puesto, view), marginMetric)] : [];
        });
      });
      const maxMargin = Math.max(0, ...margins);
      let total = 0;
      vis.forEach((e) => { total += addPuestos(e, elections.indexOf(e), L, maxMargin); });
      setNotice(total
        ? outsideWithVotes.size
          ? `${outsideWithVotes.size} puesto${outsideWithVotes.size === 1 ? "" : "s"} con votos queda${outsideWithVotes.size === 1 ? "" : "n"} fuera de los polígonos UPZ.`
          : null
        : "Esta votación aún no tiene puestos vinculados a la capa geográfica.");
    } else if (territoryLevel === "localidades") {
      if (!localitiesGeo) setNotice(localitiesError || "Cargando la capa de localidades…");
      else {
        setNotice(null);
        vis.forEach((e) => addLocalidades(e, L, localitiesGeo));
      }
    } else {
      if (!upzGeo) setNotice(upzError || (upzLoading ? "Cargando los límites de UPZ…" : "Preparando la capa de UPZ…"));
      else {
        vis.forEach((e) => addUpz(e, L, upzGeo));
        setNotice(`${pollingStationSummary.upz_without_stations} UPZ sin puestos se muestran en gris.${outsideWithVotes.size ? ` ${outsideWithVotes.size} puesto${outsideWithVotes.size === 1 ? "" : "s"} con votos queda${outsideWithVotes.size === 1 ? "" : "n"} fuera de estos polígonos y no se suma a una UPZ.` : ""}`);
      }
    }

    setLegend(vis.map((e) => ({ election: e })));
    setLegendHint(
      territoryLevel === "puestos"
        ? `Círculo exterior: ganador · interior: segundo lugar · tamaño según ${marginMetric === "absolute" ? "diferencia absoluta de votos" : "diferencia porcentual del total"} · número: puestos agrupados.`
        : territoryLevel === "upz"
          ? `Los votos de los puestos se suman por UPZ; cada elección es una capa transparente. Las UPZ sin puestos tienen relleno gris.`
          : mode === "split"
            ? "Cada localidad se divide en franjas proporcionales; las elecciones se superponen con transparencia."
            : "Cada elección seleccionada se superpone con transparencia; los colores se mezclan en las zonas compartidas."
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, visible, mode, opacity, marginMetric, territoryLevel, localitiesGeo, upzGeo, localitiesError, upzError, upzLoading, elections, resultViewByElection]);

  // --- Encuadrar automáticamente al cambiar de capa territorial ---
  useEffect(() => {
    const geoData = territoryLevel === "upz" ? upzGeo : localitiesGeo;
    const key = `${territoryLevel}:${geoData?.features.length ?? 0}`;
    if (!ready || territoryLevel === "puestos" || !geoData || fittedLayerRef.current === key) return;
    fittedLayerRef.current = key;
    try { mapRef.current.fitBounds(LRef.current.geoJSON(geoData).getBounds().pad(0.035)); } catch {}
  }, [ready, territoryLevel, localitiesGeo, upzGeo]);

  // --- Encuadrar los puestos disponibles de las elecciones seleccionadas ---
  const visibleGeographyPoints = useMemo(() => {
    const points: [number, number][] = [];
    const seen = new Set<string>();
    visible.forEach((id) => {
      const election = elections.find((item) => item.id === id);
      election?.puestos.forEach((puesto) => {
        const station = stationForPuesto(puesto);
        const lat = Number.isFinite(puesto.lat) ? puesto.lat : station?.latitude;
        const lng = Number.isFinite(puesto.lng) ? puesto.lng : station?.longitude;
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
        const key = `${lat},${lng}`;
        if (seen.has(key)) return;
        seen.add(key);
        points.push([Number(lat), Number(lng)]);
      });
    });
    return points;
  }, [visible, elections]);
  useEffect(() => {
    if (!ready || territoryLevel !== "puestos" || !visibleGeographyPoints.length) return;
    const key = `puestos:${visible.join(",")}:${visibleGeographyPoints.length}`;
    if (fittedLayerRef.current === key) return;
    fittedLayerRef.current = key;
    try { mapRef.current.fitBounds(LRef.current.latLngBounds(visibleGeographyPoints).pad(0.05)); } catch {}
  }, [ready, territoryLevel, visible, visibleGeographyPoints]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="absolute inset-0" />

      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18, duration: 0.4 }}
        className="glass-panel pointer-events-none absolute right-4 top-4 z-[500] hidden items-center gap-2 rounded-full px-3 py-2 text-[10px] text-muted shadow-dossier sm:flex"
      >
        <span className="signal-dot h-1.5 w-1.5 rounded-full bg-signal" />
        <span className="font-semibold uppercase tracking-[0.16em] text-fg">Exploración territorial</span>
        <span className="border-l border-border-soft pl-2">Leaflet · Bogotá</span>
      </motion.div>

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
          className="glass-panel absolute bottom-6 right-4 z-[500] max-h-[42%] max-w-[15.5rem] overflow-auto rounded-2xl p-3.5 text-[12px] shadow-dossier-lg"
        >
          {legend.map(({ election }) => {
            const view = resultViewByElection?.[election.id] || "candidate";
            const items = election.partyMode && view === "party"
              ? Array.from(new Set(election.candidates.map((candidate) => candidate.party || candidate.name))).map((name) => ({ id: name, name, color: displayColor(election, name, view) }))
              : election.candidates.map((candidate) => ({ id: candidate.id, name: candidate.name, color: candidate.color }));
            return (
              <div key={election.id} className="mb-2 last:mb-0">
                <b className="mb-1 flex items-center gap-1.5 font-display text-[13px]"><MapPin className="h-3 w-3 text-accent" />{election.name}</b>
                {items.length ? (
                  items.map((item) => (
                    <div key={item.id} className="flex items-center gap-1.5 py-0.5">
                      <span className="h-2 w-2 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,.18)]" style={{ background: item.color }} />
                      {item.name}
                    </div>
                  ))
                ) : (
                  <div className="text-muted">Sin candidatos</div>
                )}
              </div>
            );
          })}
          {territoryLevel === "upz" && (
            <div className="mt-1 flex items-center gap-1.5 border-t border-border-soft pt-1.5 text-[11px] text-muted">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: "#858b99" }} />Sin puestos en la fuente
            </div>
          )}
          {legendHint && <div className="mt-1.5 border-t border-border-soft pt-1.5 text-[11px] text-muted">{legendHint}</div>}
        </motion.div>
      )}
    </div>
  );
}
