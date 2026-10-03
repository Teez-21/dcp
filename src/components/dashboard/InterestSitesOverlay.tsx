"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { Check, ChevronDown, ChevronUp, Crosshair, ExternalLink, LoaderCircle, LockKeyhole, MapPin, Search, Send, ShieldCheck, X } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";
import { pollingStationGeo } from "@/lib/pollingStations";

type InterestSite = {
  id: string;
  name: string;
  site_type: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  source_note: string;
  created_at: string;
};

type InterestSubmission = InterestSite & {
  status: "pending" | "approved" | "rejected";
};

type PickedPoint = { latitude: number; longitude: number };
type SearchResult = {
  id: string;
  title: string;
  detail: string;
  latitude: number;
  longitude: number;
  kind: "sitio" | "puesto" | "dirección";
};
type ProposalDraft = {
  name: string;
  site_type: string;
  description: string;
  address: string;
  source_note: string;
  website: string;
};
type Props = {
  map: any;
  leaflet: any;
  selectingPoint: boolean;
  pickedPoint: PickedPoint | null;
  onPickRequest: () => void;
  onCancelPick: () => void;
  onClearPickedPoint: () => void;
};

type Notice = { tone: "info" | "success" | "error"; text: string };

const EMPTY_DRAFT: ProposalDraft = {
  name: "",
  site_type: "Espacio público",
  description: "",
  address: "",
  source_note: "",
  website: "",
};

const GEOAPIFY_KEY = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY?.trim() || "";

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char] as string));
}

function normalize(value: unknown): string {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es").trim();
}

function inBogotaBounds(latitude: number, longitude: number): boolean {
  return Number.isFinite(latitude) && Number.isFinite(longitude) && latitude >= 3 && latitude <= 5.5 && longitude >= -75 && longitude <= -72.5;
}

function parseCoordinates(query: string): PickedPoint | null {
  const match = query.trim().match(/^(-?\d{1,2}(?:\.\d+)?)\s*[,; ]\s*(-?\d{1,3}(?:\.\d+)?)$/);
  if (!match) return null;
  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  return inBogotaBounds(latitude, longitude) ? { latitude, longitude } : null;
}

export default function InterestSitesOverlay({ map, leaflet, selectingPoint, pickedPoint, onPickRequest, onCancelPick, onClearPickedPoint }: Props) {
  const client = useMemo(() => getSupabaseClient(), []);
  const [sites, setSites] = useState<InterestSite[]>([]);
  const [sitesLoading, setSitesLoading] = useState(true);
  const [sitesError, setSitesError] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isEditor, setIsEditor] = useState(false);
  const [checkingEditor, setCheckingEditor] = useState(false);
  const [submissions, setSubmissions] = useState<InterestSubmission[]>([]);
  const [queueOpen, setQueueOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [proposalPoint, setProposalPoint] = useState<PickedPoint | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [draft, setDraft] = useState<ProposalDraft>(EMPTY_DRAFT);
  const [formBusy, setFormBusy] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchMessage, setSearchMessage] = useState("");
  const [searching, setSearching] = useState(false);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const siteLayerRef = useRef<any>(null);
  const searchLayerRef = useRef<any>(null);
  const lastExternalSearchAt = useRef(0);
  const dialogRef = useRef<HTMLElement | null>(null);
  const closeProposalRef = useRef<() => void>(() => undefined);

  const loadSites = useCallback(async () => {
    if (!client) {
      setSitesLoading(false);
      setSitesError("Supabase todavía no está configurado; los puntos compartidos no se pueden cargar.");
      return;
    }
    setSitesLoading(true);
    const { data, error } = await client.from("interest_sites").select("*").order("name", { ascending: true });
    if (error) {
      setSitesError("No fue posible cargar los Sitios de interés. Revisa la migración de Supabase.");
      setSites([]);
    } else {
      setSitesError(null);
      setSites((data ?? []) as InterestSite[]);
    }
    setSitesLoading(false);
  }, [client]);

  const loadSubmissions = useCallback(async () => {
    if (!client || !isEditor) return;
    const { data, error } = await client
      .from("interest_site_submissions")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (error) {
      setNotice({ tone: "error", text: "No se pudo cargar la bandeja de propuestas." });
      setSubmissions([]);
    } else {
      setSubmissions((data ?? []) as InterestSubmission[]);
    }
  }, [client, isEditor]);

  const verifyEditor = useCallback(async (activeSession: Session | null) => {
    if (!client || !activeSession) {
      setIsEditor(false);
      setCheckingEditor(false);
      return false;
    }
    setCheckingEditor(true);
    const { data, error } = await client.rpc("is_character_editor");
    setCheckingEditor(false);
    const allowed = !error && data === true;
    setIsEditor(allowed);
    return allowed;
  }, [client]);

  useEffect(() => {
    void loadSites();
  }, [loadSites]);

  useEffect(() => {
    if (!client) return;
    let active = true;
    const hydrate = async () => {
      const { data } = await client.auth.getSession();
      if (!active) return;
      setSession(data.session);
      if (data.session) await verifyEditor(data.session);
    };
    void hydrate();
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setCheckingEditor(Boolean(nextSession));
      window.setTimeout(() => {
        if (active) void verifyEditor(nextSession);
      }, 0);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [client, verifyEditor]);

  useEffect(() => {
    if (isEditor) void loadSubmissions();
    else setSubmissions([]);
  }, [isEditor, loadSubmissions]);

  useEffect(() => {
    if (!map || !leaflet) return;
    const layer = leaflet.layerGroup().addTo(map);
    siteLayerRef.current = layer;
    sites.forEach((site) => {
      if (!inBogotaBounds(Number(site.latitude), Number(site.longitude))) return;
      const marker = leaflet.marker([site.latitude, site.longitude], {
        icon: leaflet.divIcon({ html: '<span class="interest-map-pin"><span></span></span>', className: "interest-map-pin-shell", iconSize: [30, 36], iconAnchor: [15, 32] }),
        title: site.name,
        alt: `Sitio de interés: ${site.name}`,
      });
      const detail = [site.site_type, site.address].filter(Boolean).join(" · ");
      marker.bindTooltip(escapeHtml(site.name), { direction: "top", offset: [0, -21] });
      marker.bindPopup(`<div class="dossier-pop"><h4>${escapeHtml(site.name)}</h4><div class="hint">${escapeHtml(detail)}</div><p>${escapeHtml(site.description)}</p>${site.source_note ? `<div class="hint">Fuente: ${escapeHtml(site.source_note)}</div>` : ""}</div>`);
      marker.addTo(layer);
    });
    return () => {
      map.removeLayer(layer);
      siteLayerRef.current = null;
    };
  }, [map, leaflet, sites]);

  useEffect(() => {
    if (!map || !leaflet) return;
    const layer = leaflet.layerGroup().addTo(map);
    searchLayerRef.current = layer;
    return () => {
      map.removeLayer(layer);
      searchLayerRef.current = null;
    };
  }, [map, leaflet]);

  useEffect(() => {
    if (!pickedPoint) return;
    setProposalPoint(pickedPoint);
    setDraft(EMPTY_DRAFT);
    setNotice(null);
    setFormOpen(true);
    onClearPickedPoint();
  }, [pickedPoint, onClearPickedPoint]);

  const search = async (event?: FormEvent) => {
    event?.preventDefault();
    const query = searchQuery.trim();
    if (query.length < 2 || !map || !leaflet) return;
    setSearching(true);
    setSearchMessage("");

    const localResults: SearchResult[] = [];
    const needle = normalize(query);
    sites.forEach((site) => {
      const corpus = normalize([site.name, site.site_type, site.description, site.address].join(" "));
      if (corpus.includes(needle)) {
        localResults.push({ id: `site-${site.id}`, title: site.name, detail: ["Sitio aprobado", site.site_type, site.address].filter(Boolean).join(" · "), latitude: Number(site.latitude), longitude: Number(site.longitude), kind: "sitio" });
      }
    });
    pollingStationGeo.forEach((station) => {
      const corpus = normalize([station.name, station.site_name, station.address, station.locality_name, station.upz_name, station.station_number].join(" "));
      if (corpus.includes(needle)) {
        localResults.push({ id: `station-${station.station_key}`, title: station.name, detail: ["Puesto de votación", station.address, station.locality_name, station.upz_code ? `UPZ ${station.upz_code}` : ""].filter(Boolean).join(" · "), latitude: Number(station.latitude), longitude: Number(station.longitude), kind: "puesto" });
      }
    });

    const coordinate = parseCoordinates(query);
    if (coordinate) {
      localResults.unshift({ id: `coord-${coordinate.latitude}-${coordinate.longitude}`, title: "Coordenadas ingresadas", detail: "Punto dentro del área de Bogotá", ...coordinate, kind: "dirección" });
    }

    let externalResults: SearchResult[] = [];
    let externalMessage = "";
    if (GEOAPIFY_KEY) {
      const now = Date.now();
      if (now - lastExternalSearchAt.current < 1000) {
        externalMessage = "Espera un segundo antes de hacer otra búsqueda externa.";
      } else {
        lastExternalSearchAt.current = now;
        try {
          const params = new URLSearchParams({
            text: `${query}, Bogotá, Colombia`,
            lang: "es",
            limit: "5",
            format: "json",
            filter: "rect:-75,3,-72.5,5.5|countrycode:co",
            apiKey: GEOAPIFY_KEY,
          });
          const response = await fetch(`https://api.geoapify.com/v1/geocode/search?${params.toString()}`);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const payload = await response.json() as { results?: { lon?: number; lat?: number; formatted?: string; name?: string; result_type?: string; place_id?: string }[] };
          externalResults = (payload.results ?? []).flatMap((item, index) => {
            const latitude = Number(item.lat), longitude = Number(item.lon);
            if (!inBogotaBounds(latitude, longitude)) return [];
            return [{
              id: `geo-${item.place_id || index}-${latitude}-${longitude}`,
              title: item.name || item.formatted || "Lugar encontrado",
              detail: item.formatted || "Resultado de Geoapify · verifica el punto en el mapa",
              latitude,
              longitude,
              kind: "dirección" as const,
            }];
          });
          if (!externalResults.length) externalMessage = "Geoapify no encontró resultados dentro del área de Bogotá.";
        } catch {
          externalMessage = "No se pudo consultar Geoapify. Puedes seguir buscando puestos y puntos aprobados localmente.";
        }
      }
    } else {
      externalMessage = "Búsqueda local activa. Para direcciones y lugares externos falta la clave gratuita opcional de Geoapify.";
    }

    const results = [...externalResults, ...localResults]
      .filter((item) => inBogotaBounds(item.latitude, item.longitude))
      .filter((item, index, all) => all.findIndex((other) => Math.abs(other.latitude - item.latitude) < 0.00002 && Math.abs(other.longitude - item.longitude) < 0.00002) === index)
      .slice(0, 8);
    setSearchResults(results);
    setSearchMessage(results.length ? externalMessage : (externalMessage || "No encontramos coincidencias; prueba otro nombre o una dirección."));
    setSearching(false);
  };

  const selectSearchResult = (result: SearchResult) => {
    if (!map || !leaflet) return;
    map.flyTo([result.latitude, result.longitude], Math.max(map.getZoom(), 16), { duration: 0.7 });
    searchLayerRef.current?.clearLayers();
    const marker = leaflet.marker([result.latitude, result.longitude], {
      icon: leaflet.divIcon({ html: '<span class="interest-search-pin"></span>', className: "interest-search-pin-shell", iconSize: [24, 28], iconAnchor: [12, 25] }),
      title: result.title,
    });
    marker.bindPopup(`<div class="dossier-pop"><h4>${escapeHtml(result.title)}</h4><div class="hint">${escapeHtml(result.detail)}</div></div>`).addTo(searchLayerRef.current);
    marker.openPopup();
    setSearchMessage("");
  };

  const submitProposal = async (event: FormEvent) => {
    event.preventDefault();
    if (!client || !proposalPoint) {
      setNotice({ tone: "error", text: "No se seleccionó un punto del mapa o no hay conexión con Supabase." });
      return;
    }
    if (draft.website.trim()) {
      setFormOpen(false);
      setNotice({ tone: "success", text: "Propuesta recibida para revisión editorial." });
      return;
    }
    if (!inBogotaBounds(proposalPoint.latitude, proposalPoint.longitude)) {
      setNotice({ tone: "error", text: "El punto debe quedar dentro del área de Bogotá." });
      return;
    }
    setFormBusy(true);
    setNotice(null);
    const { error } = await client.from("interest_site_submissions").insert({
      name: draft.name.trim(),
      site_type: draft.site_type.trim(),
      description: draft.description.trim(),
      address: draft.address.trim(),
      latitude: proposalPoint.latitude,
      longitude: proposalPoint.longitude,
      source_note: draft.source_note.trim(),
      website: "",
    });
    setFormBusy(false);
    if (error) {
      setNotice({ tone: "error", text: "No se pudo enviar. Verifica que la migración de Sitios de interés ya esté aplicada." });
      return;
    }
    setDraft(EMPTY_DRAFT);
    setFormOpen(false);
    setNotice({ tone: "success", text: "Propuesta recibida. Sólo aparecerá en el mapa cuando la apruebe la cuenta editorial." });
  };

  const signInEditor = async (event: FormEvent) => {
    event.preventDefault();
    if (!client) return;
    setLoginBusy(true);
    const { data, error } = await client.auth.signInWithPassword({ email: loginEmail.trim(), password: loginPassword });
    setLoginBusy(false);
    if (error || !data.session) {
      setNotice({ tone: "error", text: "No se pudo iniciar sesión editorial. Comprueba el correo y la contraseña." });
      return;
    }
    setSession(data.session);
    const allowed = await verifyEditor(data.session);
    setLoginOpen(false);
    setLoginPassword("");
    setNotice({ tone: allowed ? "success" : "error", text: allowed ? "Sesión editorial iniciada." : "La cuenta no tiene permisos de moderación." });
    if (!allowed) await client.auth.signOut();
  };

  const signOut = async () => {
    if (!client) return;
    const { error } = await client.auth.signOut();
    if (error) {
      setNotice({ tone: "error", text: "No se pudo cerrar la sesión editorial." });
      return;
    }
    setSession(null);
    setIsEditor(false);
    setSubmissions([]);
    setNotice({ tone: "info", text: "Sesión editorial cerrada." });
  };

  const review = async (submission: InterestSubmission, action: "approve" | "reject") => {
    if (!client || !isEditor) return;
    setReviewingId(submission.id);
    const functionName = action === "approve" ? "approve_interest_site_submission" : "reject_interest_site_submission";
    const { error } = await client.rpc(functionName, { p_submission_id: submission.id });
    if (error) {
      setNotice({ tone: "error", text: action === "approve" ? "No se pudo aprobar el punto." : "No se pudo rechazar la propuesta." });
    } else {
      await Promise.all([loadSites(), loadSubmissions()]);
      setNotice({ tone: "success", text: action === "approve" ? "Sitio aprobado y publicado en el mapa." : "Propuesta rechazada; no aparecerá en el mapa." });
    }
    setReviewingId(null);
  };

  const closeProposal = () => {
    setFormOpen(false);
    setProposalPoint(null);
    setDraft(EMPTY_DRAFT);
    onCancelPick();
    onClearPickedPoint();
  };

  useEffect(() => {
    closeProposalRef.current = closeProposal;
  });

  useEffect(() => {
    if (!formOpen && !loginOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusable = () => Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]):not([tabindex="-1"]), textarea:not([disabled]), select:not([disabled])'
    ) ?? []);
    const frame = window.requestAnimationFrame(() => focusable()[0]?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (formOpen) closeProposalRef.current();
        else setLoginOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus();
    };
  }, [formOpen, loginOpen]);

  return (
    <div
      className="interest-overlay pointer-events-auto absolute right-4 top-4 z-[650] w-[min(22rem,calc(100%-2rem))]"
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
    >
      <section className="interest-search-card">
        <div className="interest-panel-heading">
          <div><p className="interest-kicker"><MapPin className="h-3 w-3" />Sitios de interés</p><p className="interest-count">{sitesLoading ? "Cargando puntos…" : `${sites.length} punto${sites.length === 1 ? "" : "s"} aprobado${sites.length === 1 ? "" : "s"}`}</p></div>
          <button type="button" className="interest-icon-button" title={sites.length ? "Mostrar sitios aprobados" : "Capa de Sitios de interés"} onClick={() => { if (sites.length && map) map.flyToBounds(leaflet.latLngBounds(sites.map((site) => [site.latitude, site.longitude])), { padding: [30, 30], maxZoom: 14 }); }}>
            <Crosshair className="h-4 w-4" />
          </button>
          <button type="button" className="interest-icon-button" title={panelCollapsed ? "Expandir panel" : "Plegar panel para ver el mapa"} aria-label={panelCollapsed ? "Expandir panel" : "Plegar panel para ver el mapa"} aria-expanded={!panelCollapsed} onClick={() => setPanelCollapsed((collapsed) => !collapsed)}>
            {panelCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
        </div>
        {selectingPoint && <div className="interest-picking-banner" role="status"><span>Haz clic en el mapa para marcar el lugar.</span><button type="button" onClick={onCancelPick}>Cancelar</button></div>}
        {!panelCollapsed && <>
        <form className="interest-search-form" onSubmit={search}>
          <label className="sr-only" htmlFor="interest-place-search">Buscar dirección, puesto o sitio</label>
          <input id="interest-place-search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Buscar lugar, dirección o puesto…" maxLength={180} />
          <button type="submit" disabled={searching || searchQuery.trim().length < 2} aria-label="Buscar">
            {searching ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </button>
        </form>
        <p className="interest-search-caption">
          {GEOAPIFY_KEY ? <>Al buscar, la consulta se envía a Geoapify · <a href="https://www.geoapify.com/" target="_blank" rel="noreferrer">atribución <ExternalLink className="inline h-2.5 w-2.5" /></a></> : "Búsqueda local disponible; la búsqueda externa de direcciones requiere una clave Geoapify gratuita."}
        </p>
        {searchResults.length > 0 && <div className="interest-search-results" role="listbox" aria-label="Resultados de búsqueda">
          {searchResults.map((result) => <button key={result.id} type="button" className="interest-search-result" onClick={() => selectSearchResult(result)} role="option" aria-selected="false">
            <span className="interest-result-icon"><MapPin className="h-3.5 w-3.5" /></span><span className="min-w-0"><b>{result.title}</b><small>{result.detail}</small></span>
          </button>)}
        </div>}
        {searchMessage && <p className="interest-inline-note" role="status">{searchMessage}</p>}
        {sitesError && <p className="interest-inline-error" role="status">{sitesError}</p>}
        <div className="interest-actions">
          <button type="button" className="interest-propose-button" onClick={() => { setPanelCollapsed(false); setNotice(null); setFormOpen(false); setDraft(EMPTY_DRAFT); onPickRequest(); }}>
            <Crosshair className="h-3.5 w-3.5" /> Proponer punto de interés
          </button>
          <div className="interest-editor-actions">
            {isEditor ? <>
              <button type="button" className="interest-editor-button" onClick={() => setQueueOpen((open) => !open)}><ShieldCheck className="h-3.5 w-3.5" /> Revisar <span>{submissions.length}</span></button>
              <button type="button" className="interest-editor-button" onClick={signOut} title={`Cerrar sesión de ${session?.user.email ?? "editor"}`}><X className="h-3.5 w-3.5" /> Salir</button>
            </> : <button type="button" className="interest-editor-button" onClick={() => setLoginOpen(true)} disabled={checkingEditor}><LockKeyhole className="h-3.5 w-3.5" /> Acceso editorial</button>}
          </div>
        </div>
        {sites.length === 0 && !sitesLoading && !sitesError && <p className="interest-inline-note">Aún no hay puntos publicados. Las propuestas son privadas hasta su aprobación.</p>}
        </>}
      </section>

      {notice && <div className={`interest-notice interest-notice-${notice.tone}`} role="status"><span>{notice.text}</span><button type="button" aria-label="Cerrar mensaje" onClick={() => setNotice(null)}><X className="h-3.5 w-3.5" /></button></div>}

      {queueOpen && isEditor && <section className="interest-review-panel" aria-label="Propuestas pendientes">
        <div className="flex items-center justify-between gap-2"><h3>Propuestas pendientes <span>{submissions.length}</span></h3><button type="button" aria-label="Cerrar propuestas" onClick={() => setQueueOpen(false)}><X className="h-4 w-4" /></button></div>
        {submissions.length === 0 ? <p className="interest-review-empty">No hay propuestas pendientes.</p> : <div className="interest-review-list">
          {submissions.map((submission) => <article className="interest-review-card" key={submission.id}>
            <div className="flex items-start justify-between gap-2"><h4>{submission.name}</h4><span>{submission.site_type}</span></div>
            <p>{submission.description}</p>
            <small>{submission.address || `${submission.latitude.toFixed(5)}, ${submission.longitude.toFixed(5)}`}</small>
            {submission.source_note && <small>Fuente: {submission.source_note}</small>}
            <div className="mt-3 flex gap-2"><button type="button" disabled={reviewingId === submission.id} className="interest-approve-button" onClick={() => void review(submission, "approve")}><Check className="h-3.5 w-3.5" /> Aprobar</button><button type="button" disabled={reviewingId === submission.id} className="interest-reject-button" onClick={() => void review(submission, "reject")}><X className="h-3.5 w-3.5" /> Rechazar</button></div>
          </article>)}
        </div>}
      </section>}

      {formOpen && proposalPoint && <div className="character-modal-backdrop" role="presentation" onClick={closeProposal}>
        <section ref={dialogRef} className="character-modal interest-modal" role="dialog" aria-modal="true" aria-labelledby="interest-proposal-title" onClick={(event) => event.stopPropagation()}>
          <div className="flex items-start justify-between gap-4"><div><p className="interest-kicker"><MapPin className="h-3 w-3" />Punto seleccionado</p><h2 id="interest-proposal-title" className="mt-2 font-display text-2xl">Proponer un Sitio de interés</h2><p className="mt-2 text-[11px] text-muted">{proposalPoint.latitude.toFixed(5)}, {proposalPoint.longitude.toFixed(5)} · la propuesta no será pública hasta aprobarse.</p></div><button type="button" className="character-close-button" onClick={closeProposal} aria-label="Cerrar formulario"><X className="h-4 w-4" /></button></div>
          <form className="interest-proposal-form" onSubmit={submitProposal}>
            <label className="character-field">Nombre del lugar <b>*</b><input className="character-input" required minLength={2} maxLength={120} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Ej. Casa de la Cultura…" /></label>
            <label className="character-field">Tipo de lugar <b>*</b><select className="character-input" required value={draft.site_type} onChange={(event) => setDraft({ ...draft, site_type: event.target.value })}><option>Espacio público</option><option>Organización comunitaria</option><option>Equipamiento cultural</option><option>Institución pública</option><option>Educación</option><option>Salud</option><option>Político / administrativo</option><option>Otro</option></select></label>
            <label className="character-field">Descripción breve <b>*</b><textarea className="character-input character-textarea" required minLength={5} maxLength={1200} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="¿Qué hace relevante este lugar?" /></label>
            <label className="character-field">Dirección o referencia<input className="character-input" maxLength={300} value={draft.address} onChange={(event) => setDraft({ ...draft, address: event.target.value })} placeholder="Dirección o punto de referencia" /></label>
            <label className="character-field">Fuente o nota de verificación<input className="character-input" maxLength={1000} value={draft.source_note} onChange={(event) => setDraft({ ...draft, source_note: event.target.value })} placeholder="URL o contexto para revisión editorial" /></label>
            <label className="character-honeypot" aria-hidden="true">Sitio web<input tabIndex={-1} autoComplete="off" value={draft.website} onChange={(event) => setDraft({ ...draft, website: event.target.value })} /></label>
            <p className="interest-privacy-note">No incluyas datos personales sensibles. El punto sólo se publicará después de la revisión editorial.</p>
            <div className="flex justify-end gap-2"><button type="button" className="character-reject-button" onClick={closeProposal}>Cancelar</button><button type="submit" disabled={formBusy || !client} className="character-approve-button">{formBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Enviar propuesta</button></div>
          </form>
        </section>
      </div>}

      {loginOpen && <div className="character-modal-backdrop" role="presentation" onClick={() => setLoginOpen(false)}>
        <section ref={dialogRef} className="character-modal" role="dialog" aria-modal="true" aria-labelledby="interest-login-title" onClick={(event) => event.stopPropagation()}>
          <div className="flex items-start justify-between gap-4"><div><p className="interest-kicker"><LockKeyhole className="h-3 w-3" />Cuenta única</p><h2 id="interest-login-title" className="mt-2 font-display text-2xl">Acceso editorial</h2><p className="mt-2 text-[11px] text-muted">Sólo la cuenta autorizada puede aprobar o rechazar puntos.</p></div><button type="button" className="character-close-button" onClick={() => setLoginOpen(false)} aria-label="Cerrar"><X className="h-4 w-4" /></button></div>
          <form className="interest-proposal-form" onSubmit={signInEditor}>
            <label className="character-field">Correo<input className="character-input" type="email" required autoComplete="username" value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} /></label>
            <label className="character-field">Contraseña<input className="character-input" type="password" required autoComplete="current-password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} /></label>
            <div className="flex justify-end gap-2"><button type="button" className="character-reject-button" onClick={() => setLoginOpen(false)}>Cancelar</button><button type="submit" disabled={loginBusy} className="character-approve-button">{loginBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />} Entrar</button></div>
          </form>
        </section>
      </div>}
    </div>
  );
}
