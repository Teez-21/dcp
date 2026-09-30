"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  Election, MapMode, ThemeName, Puesto, GeoFC,
  newElection, ensureCand, locKey, parseCSV, pick, toVotes, toCoord,
  puestoKey, simpleName, norm, NON_CANDIDATES, LOC_NAMES,
  loadLocalidadesGeoJSON,
} from "@/lib/electoral";

type State = {
  elections: Election[];
  visible: string[];
  editing: string;
  mode: MapMode;
  opacity: number;
  geo: GeoFC | null;
  nameProp: string | null;
  theme: ThemeName;
};

type Actions = {
  setTheme: (t: ThemeName) => void;
  toggleVisible: (id: string) => void;
  setEditing: (id: string) => void;
  setMode: (m: MapMode) => void;
  setOpacity: (v: number) => void;
  addElection: (name: string) => void;
  renameElection: (id: string, name: string) => void;
  deleteElection: (id: string) => void;
  clearElectionData: (id: string) => void;
  recolorCandidate: (electionId: string, candId: string, color: string) => void;
  renameCandidate: (electionId: string, candId: string, name: string) => void;
  removeCandidate: (electionId: string, candId: string) => void;
  addCandidate: (electionId: string, name: string) => void;

  importGeoJSON: (raw: unknown) => void;
  importLocalidadesCSV: (text: string, electionId: string) => number;
  importPuestosCSV: (text: string, electionId: string) => number;
  importRegistraduriaCSV: (text: string, electionId: string) => { localidades: number; puestos: number; skipped: number };
  importCoordsCSV: (text: string, electionId: string) => { ok: number; miss: number; total: number };
  exportProject: () => string;
  importProject: (json: string) => void;
};

const defaultElections = (): Election[] => [
  newElection("pres1", "Presidencial · 1ª vuelta"),
  newElection("pres2", "Presidencial · 2ª vuelta"),
  newElection("camara", "Cámara de Representantes 2026-2030"),
  newElection("alcaldia", "Alcaldía de Bogotá 2023-2027"),
  newElection("concejo", "Concejo de Bogotá 2023-2027"),
];

export const useDashboardStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      elections: defaultElections(),
      visible: ["pres1"],
      editing: "pres1",
      mode: "winner",
      opacity: 0.3,
      geo: null,
      nameProp: null,
      theme: "tokyo",

      setTheme: (t) => set({ theme: t }),

      toggleVisible: (id) =>
        set((s) => {
          const has = s.visible.includes(id);
          const visible = has ? s.visible.filter((v) => v !== id) : [...s.visible, id];
          return { visible, editing: has ? s.editing : id };
        }),

      setEditing: (id) => set({ editing: id }),
      setMode: (m) => set({ mode: m }),
      setOpacity: (v) => set({ opacity: v }),

      addElection: (name) =>
        set((s) => {
          const e = newElection(Math.random().toString(36).slice(2, 8), name);
          return { elections: [...s.elections, e], editing: e.id, visible: [...s.visible, e.id] };
        }),

      renameElection: (id, name) =>
        set((s) => ({ elections: s.elections.map((e) => (e.id === id ? { ...e, name } : e)) })),

      deleteElection: (id) =>
        set((s) => {
          const elections = s.elections.filter((e) => e.id !== id);
          return {
            elections,
            visible: s.visible.filter((v) => v !== id),
            editing: s.editing === id ? elections[0]?.id ?? "" : s.editing,
          };
        }),

      clearElectionData: (id) =>
        set((s) => ({
          elections: s.elections.map((e) => (e.id === id ? { ...e, localidades: {}, puestos: [] } : e)),
        })),

      recolorCandidate: (electionId, candId, color) =>
        set((s) => ({
          elections: s.elections.map((e) =>
            e.id !== electionId ? e : { ...e, candidates: e.candidates.map((c) => (c.id === candId ? { ...c, color } : c)) }
          ),
        })),

      renameCandidate: (electionId, candId, name) =>
        set((s) => ({
          elections: s.elections.map((e) =>
            e.id !== electionId ? e : { ...e, candidates: e.candidates.map((c) => (c.id === candId ? { ...c, name } : c)) }
          ),
        })),

      removeCandidate: (electionId, candId) =>
        set((s) => ({
          elections: s.elections.map((e) =>
            e.id !== electionId ? e : { ...e, candidates: e.candidates.filter((c) => c.id !== candId) }
          ),
        })),

      addCandidate: (electionId, name) => {
        const s = get();
        const e = s.elections.find((x) => x.id === electionId);
        if (!e || !name.trim()) return;
        const clone: Election = { ...e, candidates: [...e.candidates] };
        ensureCand(clone, name);
        set({ elections: s.elections.map((x) => (x.id === electionId ? clone : x)) });
      },

      importGeoJSON: (raw) => {
        const { fc, nameProp } = loadLocalidadesGeoJSON(raw);
        set({ geo: fc, nameProp });
      },

      importLocalidadesCSV: (text, electionId) => {
        const s = get();
        const e = s.elections.find((x) => x.id === electionId);
        if (!e) return 0;
        const clone: Election = { ...e, localidades: { ...e.localidades }, candidates: [...e.candidates] };
        let n = 0;
        parseCSV(text).forEach((r) => {
          const loc = pick(r, "localidad"), cand = pick(r, "candidato", "partido", "lista", "nombre"), v = pick(r, "votos", "voto", "total");
          if (!loc || !cand) return;
          const c = ensureCand(clone, cand), k = locKey(loc);
          clone.localidades[k] = { ...(clone.localidades[k] || {}), [c.id]: toVotes(v) };
          n++;
        });
        if (!n) throw new Error("no encontré las columnas localidad, candidato y votos");
        set({ elections: s.elections.map((x) => (x.id === electionId ? clone : x)) });
        return n;
      },

      importPuestosCSV: (text, electionId) => {
        const s = get();
        const e = s.elections.find((x) => x.id === electionId);
        if (!e) return 0;
        const clone: Election = { ...e, puestos: [...e.puestos], candidates: [...e.candidates] };
        let n = 0;
        parseCSV(text).forEach((r) => {
          const name = pick(r, "puesto", "puesto de votacion", "nombre");
          const cand = pick(r, "candidato", "partido", "lista");
          const v = pick(r, "votos", "voto", "total");
          const lat = toCoord(pick(r, "lat", "latitud", "latitude"));
          const lng = toCoord(pick(r, "lng", "lon", "long", "longitud", "longitude"));
          if (!name || !cand || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
          const c = ensureCand(clone, cand);
          let p = clone.puestos.find((x) => norm(x.name) === norm(name));
          if (!p) { p = { id: name, name, localidad: pick(r, "localidad") || "", lat, lng, votes: {} }; clone.puestos.push(p); }
          p.lat = lat; p.lng = lng; p.votes = { ...p.votes, [c.id]: toVotes(v) };
          n++;
        });
        if (!n) throw new Error("no encontré las columnas puesto, lat, lng, candidato y votos");
        set({ elections: s.elections.map((x) => (x.id === electionId ? clone : x)) });
        return n;
      },

      importRegistraduriaCSV: (text, electionId) => {
        const s = get();
        const e = s.elections.find((x) => x.id === electionId);
        if (!e) return { localidades: 0, puestos: 0, skipped: 0 };
        const clone: Election = { ...e, candidates: [...e.candidates], localidades: {}, puestos: [] };
        const rows = parseCSV(text);
        const loc: Record<string, Record<string, number>> = {};
        const pu = new Map<string, Puesto>();
        const old = new Map(e.puestos.map((p) => [p.id, p]));
        let used = 0, skipped = 0;

        rows.forEach((r) => {
          const cand = pick(r, "candidato", "partido", "lista");
          const zona = parseInt(pick(r, "zona") || "", 10);
          const num = pick(r, "puesto");
          if (!cand || !Number.isFinite(zona)) return;
          if (NON_CANDIDATES.test(norm(cand))) { skipped++; return; }
          const c = ensureCand(clone, cand);
          const v = toVotes(pick(r, "votos", "voto"));
          if (zona >= 1 && zona <= 20) {
            const o = loc["L" + zona] || (loc["L" + zona] = {});
            o[c.id] = (o[c.id] || 0) + v;
          }
          if (num !== undefined) {
            const id = zona + "-" + puestoKey(num);
            let p = pu.get(id);
            if (!p) {
              const prev = old.get(id);
              p = {
                id, zona, num: puestoKey(num),
                name: pick(r, "localidad", "nombre") || "Puesto " + num,
                localidad: LOC_NAMES[zona] || "",
                lat: prev?.lat, lng: prev?.lng, votes: {},
              };
              pu.set(id, p);
            }
            p.votes[c.id] = (p.votes[c.id] || 0) + v;
          }
          used++;
        });
        if (!used) throw new Error("no encontré las columnas zona, puesto, candidato y votos");
        clone.localidades = loc;
        clone.puestos = [...pu.values()];
        set({ elections: s.elections.map((x) => (x.id === electionId ? clone : x)) });
        return { localidades: Object.keys(loc).length, puestos: clone.puestos.length, skipped };
      },

      importCoordsCSV: (text, electionId) => {
        const s = get();
        const e = s.elections.find((x) => x.id === electionId);
        if (!e || !e.puestos.length) throw new Error("primero importa los votos de la Registraduría en esta votación");
        const clone: Election = { ...e, puestos: e.puestos.map((p) => ({ ...p })) };
        let ok = 0, miss = 0;
        parseCSV(text).forEach((r) => {
          const zona = parseInt(pick(r, "zona") || "", 10);
          const num = pick(r, "puesto", "no.puesto", "no puesto", "numero");
          const nombre = pick(r, "nombre", "nombrepuesto", "nombre puesto", "nombre del puesto");
          const lat = toCoord(pick(r, "lat", "latitud", "latitude"));
          const lng = toCoord(pick(r, "lng", "lon", "long", "longitud", "longitude"));
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) { miss++; return; }
          const cands = clone.puestos.filter((p) => !Number.isFinite(zona) || p.zona === zona);
          let p: Puesto | undefined;
          if (nombre) {
            const sn = simpleName(nombre);
            p = cands.find((x) => simpleName(x.name) === sn) ||
              (sn.length >= 8 ? cands.find((x) => { const a = simpleName(x.name); return a.includes(sn) || sn.includes(a); }) : undefined);
          } else if (num !== undefined) {
            p = cands.find((x) => x.num === puestoKey(num));
          }
          if (p) { p.lat = lat; p.lng = lng; ok++; } else miss++;
        });
        set({ elections: s.elections.map((x) => (x.id === electionId ? clone : x)) });
        return { ok, miss, total: clone.puestos.length };
      },

      exportProject: () => JSON.stringify(get(), null, 1),

      importProject: (json) => {
        const parsed = JSON.parse(json);
        if (!parsed.elections) throw new Error("no parece un proyecto exportado desde esta herramienta");
        set({ ...get(), ...parsed });
      },
    }),
    { name: "datos-a-tener-en-cuenta:v1" }
  )
);
