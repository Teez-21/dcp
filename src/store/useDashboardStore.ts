"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  Election, MapMode, MarginMetric, ThemeName, Puesto, GeoFC,
  newElection, ensureCand, locKey, parseCSV, pick, toVotes, toCoord,
  puestoKey, simpleName, norm, NON_CANDIDATES, LOC_NAMES,
  loadLocalidadesGeoJSON,
} from "@/lib/electoral";
import preloadedAlcaldia from "@/data/alcaldia-2023.json";
import preloadedPresidencial from "@/data/presidencial-primera-vuelta.json";

export type JournalEntry = { id: string; title: string; body: string; createdAt: string };
export type JournalTopic = { id: string; title: string; description: string; entries: JournalEntry[] };

type State = {
  elections: Election[];
  visible: string[];
  editing: string;
  mode: MapMode;
  opacity: number;
  marginMetric: MarginMetric;
  territoryLevel: "localidades" | "upz" | "puestos";
  geo: GeoFC | null;
  nameProp: string | null;
  theme: ThemeName;
  resultViewByElection: Record<string, "party" | "candidate">;
  journalTopics: JournalTopic[];
};

type Actions = {
  setTheme: (t: ThemeName) => void;
  ensurePreloadedData: () => void;
  toggleVisible: (id: string) => void;
  setEditing: (id: string) => void;
  setMode: (m: MapMode) => void;
  setOpacity: (v: number) => void;
  setMarginMetric: (metric: MarginMetric) => void;
  setTerritoryLevel: (level: "localidades" | "upz" | "puestos") => void;
  setResultView: (electionId: string, view: "party" | "candidate") => void;
  loadPreloadedConcejo: () => Promise<void>;
  loadPreloadedCamara: () => Promise<void>;
  focusElection: (id: string) => void;
  addJournalTopic: (title: string, description?: string) => string | null;
  addJournalEntry: (topicId: string, title: string, body: string) => void;
  updateJournalTopic: (topicId: string, patch: Partial<Pick<JournalTopic, "title" | "description">>) => void;
  updateJournalEntry: (topicId: string, entryId: string, patch: Partial<Pick<JournalEntry, "title" | "body">>) => void;
  deleteJournalTopic: (topicId: string) => void;
  deleteJournalEntry: (topicId: string, entryId: string) => void;
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
  preloadedPresidencial as Election,
  newElection("pres2", "Presidencial · 2ª vuelta"),
  { ...newElection("camara", "Cámara de Representantes · Bogotá 2026–2030"), partyMode: true },
  preloadedAlcaldia as Election,
  { ...newElection("concejo", "Concejo de Bogotá 2023-2027"), partyMode: true },
];

export const useDashboardStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      elections: defaultElections(),
      visible: ["alcaldia"],
      editing: "alcaldia",
      mode: "winner",
      opacity: 0.3,
      marginMetric: "absolute",
      territoryLevel: "localidades",
      geo: null,
      nameProp: null,
      theme: "tokyo",
      resultViewByElection: { camara: "party", concejo: "party" },
      journalTopics: [],

      setTheme: (t) => set({ theme: t }),

      ensurePreloadedData: () =>
        set((s) => {
          const alcaldia = s.elections.find((e) => e.id === "alcaldia");
          if (!alcaldia) return {};
          const preloadedAlcaldiaData = preloadedAlcaldia as Election;
          const needsAlcaldiaRefresh = alcaldia.dataVersion !== preloadedAlcaldiaData.dataVersion;
          const presidencia = s.elections.find((e) => e.id === "pres1");
          const elections = s.elections.map((e) => {
            if (e.id === "alcaldia" && needsAlcaldiaRefresh) {
              const savedById = new Map(e.candidates.map((candidate) => [candidate.id, candidate]));
              const sourceIds = new Set(preloadedAlcaldiaData.candidates.map((candidate) => candidate.id));
              return {
                ...e,
                candidates: [
                  ...preloadedAlcaldiaData.candidates.map((candidate) => {
                    const saved = savedById.get(candidate.id);
                    return saved
                      ? { ...candidate, name: saved.name, color: saved.color, party: saved.party ?? candidate.party }
                      : candidate;
                  }),
                  ...e.candidates.filter((candidate) => !sourceIds.has(candidate.id)),
                ],
                localidades: preloadedAlcaldiaData.localidades,
                puestos: preloadedAlcaldiaData.puestos,
                dataVersion: preloadedAlcaldiaData.dataVersion,
              };
            }
            if (e.id === "pres1" && (!presidencia || !Object.keys(presidencia.localidades).length)) return preloadedPresidencial as Election;
            return e;
          });
          const oldEmptyView = s.visible.length === 1 && s.visible[0] === "pres1";
          const pres1 = s.elections.find((e) => e.id === "pres1");
          const oldPresidentialStateIsEmpty = !pres1 || Object.keys(pres1.localidades).length === 0;
          return oldEmptyView && oldPresidentialStateIsEmpty
            ? { elections, visible: ["alcaldia"], editing: "alcaldia" }
            : { elections };
        }),

      toggleVisible: (id) =>
        set((s) => {
          const has = s.visible.includes(id);
          const visible = has ? s.visible.filter((v) => v !== id) : [...s.visible, id];
          return { visible, editing: has ? s.editing : id };
        }),

      setEditing: (id) => set({ editing: id }),
      setMode: (m) => set({ mode: m }),
      setOpacity: (v) => set({ opacity: v }),
      setMarginMetric: (metric) => set({ marginMetric: metric }),
      setTerritoryLevel: (level) => set({ territoryLevel: level }),
      setResultView: (electionId, view) => set((s) => ({ resultViewByElection: { ...s.resultViewByElection, [electionId]: view } })),
      loadPreloadedConcejo: async () => {
        const current = get().elections.find((e) => e.id === "concejo");
        if (current && Object.keys(current.localidades).length) return;
        const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
        const response = await fetch(`${basePath}/data/concejo-2023.json`);
        if (!response.ok) throw new Error("No se pudo cargar el Concejo precargado");
        const election = await response.json() as Election;
        set((s) => ({ elections: s.elections.map((e) => e.id === "concejo" ? election : e) }));
      },
      loadPreloadedCamara: async () => {
        const version = "camara-bogota-mmv-2026-v1";
        const current = get().elections.find((e) => e.id === "camara");
        if (current?.dataVersion === version) return;
        const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
        const response = await fetch(`${basePath}/data/camara-2026.json`);
        if (!response.ok) throw new Error("No se pudo cargar el MMV de Cámara precargado");
        const election = await response.json() as Election;
        set((s) => ({
          elections: s.elections.map((saved) => {
            if (saved.id !== "camara") return saved;
            const savedById = new Map(saved.candidates.map((candidate) => [candidate.id, candidate]));
            return {
              ...election,
              name: saved.name === "Cámara de Representantes 2026-2030" ? election.name : saved.name,
              candidates: election.candidates.map((candidate) => {
                const previous = savedById.get(candidate.id);
                return previous ? { ...candidate, name: previous.name, color: previous.color } : candidate;
              }),
            };
          }),
          resultViewByElection: { ...s.resultViewByElection, camara: s.resultViewByElection.camara || "party" },
        }));
      },
      focusElection: (id) => set((s) => s.elections.some((e) => e.id === id) ? { visible: [id], editing: id } : {}),
      addJournalTopic: (title, description = "") => {
        const clean = title.trim();
        if (!clean) return null;
        const id = crypto.randomUUID();
        set((s) => ({ journalTopics: [...s.journalTopics, { id, title: clean, description: description.trim(), entries: [] }] }));
        return id;
      },
      addJournalEntry: (topicId, title, body) => {
        const clean = title.trim();
        if (!clean) return;
        set((s) => ({ journalTopics: s.journalTopics.map((topic) => topic.id !== topicId ? topic : { ...topic, entries: [...topic.entries, { id: crypto.randomUUID(), title: clean, body: body.trim(), createdAt: new Date().toISOString() }] }) }));
      },
      updateJournalTopic: (topicId, patch) => set((s) => ({ journalTopics: s.journalTopics.map((topic) => topic.id === topicId ? { ...topic, ...patch } : topic) })),
      updateJournalEntry: (topicId, entryId, patch) => set((s) => ({ journalTopics: s.journalTopics.map((topic) => topic.id !== topicId ? topic : { ...topic, entries: topic.entries.map((entry) => entry.id === entryId ? { ...entry, ...patch } : entry) }) })),
      deleteJournalTopic: (topicId) => set((s) => ({ journalTopics: s.journalTopics.filter((topic) => topic.id !== topicId) })),
      deleteJournalEntry: (topicId, entryId) => set((s) => ({ journalTopics: s.journalTopics.map((topic) => topic.id !== topicId ? topic : { ...topic, entries: topic.entries.filter((entry) => entry.id !== entryId) }) })),

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
    {
      name: "datos-a-tener-en-cuenta:v1",
      merge: (persisted, current) => {
        const saved = (persisted || {}) as Partial<State>;
        const savedElections = Array.isArray(saved.elections) ? saved.elections : current.elections;
        const savedAlcaldia = savedElections.find((e) => e.id === "alcaldia");
        const hasAlcaldiaData = Boolean(savedAlcaldia && Object.keys(savedAlcaldia.localidades || {}).length);
        const savedPresidencial = savedElections.find((e) => e.id === "pres1");
        const hasPresidencialData = Boolean(savedPresidencial && Object.keys(savedPresidencial.localidades || {}).length);
        const elections = savedElections.map((e) => {
          if (e.id === "alcaldia" && !hasAlcaldiaData) return current.elections.find((base) => base.id === "alcaldia")!;
          if (e.id === "pres1" && !hasPresidencialData) return current.elections.find((base) => base.id === "pres1")!;
          return e;
        });
        if (!elections.some((e) => e.id === "camara")) {
          const currentCamara = current.elections.find((e) => e.id === "camara");
          if (currentCamara) elections.push(currentCamara);
        }
        const isOldEmptySession = !hasAlcaldiaData && saved.visible?.length === 1 && saved.visible[0] === "pres1";
        const savedMode = (saved as any).mode;
        const savedTerritoryLevel = (saved as any).territoryLevel;
        const savedMarginMetric = (saved as any).marginMetric;
        return {
          ...current,
          ...saved,
          elections,
          visible: isOldEmptySession ? ["alcaldia"] : (saved.visible || current.visible),
          editing: isOldEmptySession ? "alcaldia" : (saved.editing || current.editing),
          resultViewByElection: { camara: "party", concejo: "party", ...(saved.resultViewByElection || {}) },
          mode: savedMode === "split" ? "split" : "winner",
          territoryLevel: savedTerritoryLevel === "upz" ? "upz" : savedTerritoryLevel === "puestos" || savedMode === "puestos" ? "puestos" : "localidades",
          marginMetric: savedMarginMetric === "percentage" ? "percentage" : "absolute",
          journalTopics: Array.isArray(saved.journalTopics) ? saved.journalTopics : current.journalTopics,
        };
      },
    }
  )
);
