"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import Image from "next/image";
import type { Session } from "@supabase/supabase-js";
import { ArrowLeft, ArrowUpRight, Check, ChevronRight, ExternalLink, FileText, LockKeyhole, LogOut, Mail, Pencil, Plus, ShieldCheck, Upload, UserRound, X } from "lucide-react";
import { CHARACTER_PHOTOS_BUCKET, getSupabaseClient } from "@/lib/supabase";
import type { CharacterDraft, CharacterProposalDraft, CharacterRecord, CharacterSubmissionRecord } from "@/types/character";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type Notice = { tone: "success" | "info" | "error"; message: string };
type DialogMode = "login" | "form" | "proposal" | "denied" | null;
type ReviewAction = "approve" | "reject";

const EMPTY_DRAFT: CharacterDraft = {
  name: "",
  character_type: "",
  contact: "",
  facebook_url: "",
  instagram_url: "",
  x_url: "",
};

const EMPTY_PROPOSAL: CharacterProposalDraft = {
  ...EMPTY_DRAFT,
  source_note: "",
  website: "",
};

export default function CharacterHub() {
  const client = useMemo(() => getSupabaseClient(), []);
  const [characters, setCharacters] = useState<CharacterRecord[]>([]);
  const [submissions, setSubmissions] = useState<CharacterSubmissionRecord[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [isEditor, setIsEditor] = useState(false);
  const [checkingEditor, setCheckingEditor] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [submissionsError, setSubmissionsError] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [editing, setEditing] = useState<CharacterRecord | null>(null);
  const [loginContinuation, setLoginContinuation] = useState<"form" | "none">("form");

  const loadCharacters = useCallback(async () => {
    if (!client) return;
    const { data, error } = await client
      .from("characters")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      setLoadError("No fue posible cargar las fichas. Revisa la configuración de Supabase.");
      return;
    }

    setLoadError(null);
    setCharacters((data ?? []) as CharacterRecord[]);
  }, [client]);

  const loadSubmissions = useCallback(async () => {
    if (!client) return;
    setSubmissionsLoading(true);
    setSubmissionsError(null);
    const { data, error } = await client
      .from("character_submissions")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      setSubmissionsError("No fue posible cargar las propuestas pendientes.");
      setSubmissions([]);
    } else {
      setSubmissions(data as CharacterSubmissionRecord[]);
    }
    setSubmissionsLoading(false);
  }, [client]);

  const verifyEditor = useCallback(async (activeSession: Session | null) => {
    if (!client || !activeSession) {
      setIsEditor(false);
      setCheckingEditor(false);
      return false;
    }

    setCheckingEditor(true);
    const { data, error } = await client.rpc("is_character_editor");
    setCheckingEditor(false);

    if (error) {
      setIsEditor(false);
      setLoadError("No se pudo comprobar el permiso editorial. La política de acceso aún debe configurarse.");
      return false;
    }

    const allowed = data === true;
    setIsEditor(allowed);
    return allowed;
  }, [client]);

  useEffect(() => {
    if (!client) {
      setLoading(false);
      return;
    }

    let active = true;
    const hydrate = async () => {
      setLoading(true);
      const { data, error } = await client.auth.getSession();
      if (!active) return;
      if (error) setLoadError("No fue posible revisar la sesión editorial.");
      setSession(data.session);
      if (data.session) await verifyEditor(data.session);
      else setCheckingEditor(false);
      if (!active) return;
      await loadCharacters();
      if (active) setLoading(false);
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
  }, [client, loadCharacters, verifyEditor]);

  useEffect(() => {
    if (!client || !isEditor) {
      setSubmissions([]);
      setSubmissionsError(null);
      return;
    }
    void loadSubmissions();
  }, [client, isEditor, loadSubmissions]);

  const openAddDialog = () => {
    setNotice(null);
    setEditing(null);
    setLoginContinuation("form");
    if (!client) {
      setNotice({ tone: "info", message: "La conexión compartida aún no está configurada; por ahora no se pueden guardar fichas." });
      return;
    }
    if (checkingEditor) {
      setNotice({ tone: "info", message: "Estamos comprobando los permisos de edición. Intenta de nuevo en un momento." });
      return;
    }
    if (!session) {
      setDialogMode("login");
      return;
    }
    if (!isEditor) {
      setDialogMode("denied");
      return;
    }
    setEditing(null);
    setDialogMode("form");
  };

  const openEditDialog = (character: CharacterRecord) => {
    setNotice(null);
    setEditing(character);
    setLoginContinuation("form");
    if (!client) {
      setNotice({ tone: "info", message: "La conexión compartida aún no está configurada; las fichas no se pueden editar." });
      return;
    }
    if (checkingEditor) {
      setNotice({ tone: "info", message: "Estamos comprobando los permisos de edición. Intenta de nuevo en un momento." });
      return;
    }
    if (!session) {
      setDialogMode("login");
      return;
    }
    if (!isEditor) {
      setDialogMode("denied");
      return;
    }
    setDialogMode("form");
  };

  const openProposalDialog = () => {
    setNotice(null);
    if (!client) {
      setNotice({ tone: "info", message: "El formulario público estará disponible cuando se conecte la base compartida." });
      return;
    }
    setDialogMode("proposal");
  };

  const openEditorLogin = () => {
    setNotice(null);
    setLoginContinuation("none");
    setDialogMode("login");
  };

  const scrollToSubmissions = () => {
    document.getElementById("propuestas-pendientes")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const authenticateEditor = async (email: string, password: string) => {
    if (!client) throw new Error("La conexión compartida aún no está configurada.");
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error || !data.session) {
      throw new Error("No se pudo iniciar sesión. Comprueba el correo y la contraseña del editor.");
    }

    setSession(data.session);
    const allowed = await verifyEditor(data.session);
    if (allowed) {
      setDialogMode(loginContinuation === "form" ? "form" : null);
      setNotice({ tone: "success", message: "Sesión editorial iniciada." });
    } else {
      setDialogMode("denied");
      setNotice({ tone: "info", message: "La cuenta inició sesión, pero todavía no tiene permisos para editar este directorio." });
    }
  };

  const saveCharacter = async (draft: CharacterDraft, imageFile: File | null) => {
    if (!client || !session || !isEditor) {
      throw new Error("Se requiere una sesión de editor autorizada para guardar cambios.");
    }
    if (imageFile && (!ALLOWED_IMAGE_TYPES.has(imageFile.type) || imageFile.size > MAX_IMAGE_BYTES)) {
      throw new Error("La imagen debe ser JPG, PNG o WebP y pesar máximo 5 MB.");
    }

    let imagePath = editing?.image_path ?? null;
    let uploadedPath: string | null = null;
    const storage = client.storage.from(CHARACTER_PHOTOS_BUCKET);

    if (imageFile) {
      const extension = imageFile.type === "image/png" ? "png" : imageFile.type === "image/webp" ? "webp" : "jpg";
      uploadedPath = `characters/${crypto.randomUUID()}.${extension}`;
      const { error } = await storage.upload(uploadedPath, imageFile, {
        cacheControl: "3600",
        contentType: imageFile.type,
        upsert: false,
      });
      if (error) throw new Error("No se pudo subir la imagen. Revisa el límite de almacenamiento y los permisos de Storage.");
      imagePath = uploadedPath;
    }

    const payload = {
      name: draft.name.trim(),
      character_type: draft.character_type.trim(),
      contact: draft.contact.trim() || null,
      facebook_url: draft.facebook_url.trim() || null,
      instagram_url: draft.instagram_url.trim() || null,
      x_url: draft.x_url.trim() || null,
      image_path: imagePath,
      updated_at: new Date().toISOString(),
    };

    let writeError: string | null = null;
    if (editing) {
      const { data, error } = await client
        .from("characters")
        .update(payload)
        .eq("id", editing.id)
        .select("id")
        .maybeSingle();
      if (error) writeError = "No se pudo actualizar la ficha. Comprueba los permisos de editor.";
      else if (!data) writeError = "La ficha no existe o tu cuenta no tiene permiso para editarla.";
    } else {
      const { error } = await client.from("characters").insert(payload);
      if (error) writeError = "No se pudo guardar la ficha. Comprueba los permisos y la configuración de la base.";
    }

    if (writeError) {
      if (uploadedPath) {
        try { await storage.remove([uploadedPath]); } catch { /* best-effort cleanup */ }
      }
      throw new Error(writeError);
    }

    if (editing?.image_path && editing.image_path !== imagePath) {
      try { await storage.remove([editing.image_path]); } catch { /* best-effort cleanup */ }
    }

    await loadCharacters();
    setDialogMode(null);
    setEditing(null);
    setNotice({ tone: "success", message: editing ? "La ficha se actualizó correctamente." : "El personaje se añadió al directorio compartido." });
  };

  const submitProposal = async (draft: CharacterProposalDraft) => {
    if (!client) throw new Error("La conexión compartida aún no está configurada.");
    // Bots que completan el campo invisible se dejan salir sin crear una fila.
    if (draft.website.trim()) {
      setDialogMode(null);
      setNotice({ tone: "success", message: "Recibimos la propuesta. Sólo se publicará después de la revisión editorial." });
      return;
    }

    const { error } = await client.from("character_submissions").insert({
      name: draft.name.trim(),
      character_type: draft.character_type.trim(),
      contact: draft.contact.trim(),
      facebook_url: draft.facebook_url.trim(),
      instagram_url: draft.instagram_url.trim(),
      x_url: draft.x_url.trim(),
      source_note: draft.source_note.trim(),
      website: "",
    });
    if (error) throw new Error("No fue posible enviar la propuesta. Inténtalo de nuevo más tarde.");

    setDialogMode(null);
    setNotice({ tone: "success", message: "Propuesta recibida. No será pública hasta que la revise y apruebe la cuenta editorial." });
  };

  const reviewSubmission = async (id: string, action: ReviewAction) => {
    if (!client || !session || !isEditor) return;
    setReviewingId(id);
    setNotice(null);
    const functionName = action === "approve" ? "approve_character_submission" : "reject_character_submission";
    const { error } = await client.rpc(functionName, { p_submission_id: id });
    if (error) {
      setNotice({ tone: "error", message: action === "approve" ? "No se pudo aprobar la propuesta." : "No se pudo rechazar la propuesta." });
      setReviewingId(null);
      return;
    }

    await Promise.all([loadCharacters(), loadSubmissions()]);
    setNotice({ tone: "success", message: action === "approve" ? "Propuesta aprobada y publicada." : "Propuesta rechazada; no aparecerá en el directorio." });
    setReviewingId(null);
  };

  const signOut = async () => {
    if (!client) return;
    const { error } = await client.auth.signOut();
    if (error) {
      setNotice({ tone: "error", message: "No fue posible cerrar la sesión." });
      return;
    }
    setSession(null);
    setIsEditor(false);
    setNotice({ tone: "info", message: "Sesión editorial cerrada." });
  };

  const photoUrl = (path: string | null) => {
    if (!client || !path) return null;
    return client.storage.from(CHARACTER_PHOTOS_BUCKET).getPublicUrl(path).data.publicUrl;
  };

  return (
    <main className="character-page nexus-page relative min-h-screen overflow-x-clip text-mist-100">
      <div className="grain pointer-events-none fixed inset-0 z-[1]" />
      <div className="character-glow pointer-events-none absolute inset-x-0 top-0 h-[34rem]" />
      <div className="container-wide relative z-10 mx-auto px-5 pb-12 pt-6 sm:px-8 md:px-12 md:pt-10">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-5">
          <a href="/#inicio" className="magnetic-button magnetic-button-ghost">
            <ArrowLeft className="h-4 w-4" /> Volver al inicio
          </a>
          <div className="flex flex-wrap items-center gap-2">
            {session && isEditor && (
              <>
                <span className="character-editor-badge"><ShieldCheck className="h-3.5 w-3.5" /> Editor autorizado</span>
                <button type="button" onClick={signOut} className="character-signout" title={`Cerrar sesión de ${session.user.email ?? "editor"}`}>
                  <LogOut className="h-4 w-4" /><span className="hidden sm:inline">Salir</span>
                </button>
              </>
            )}
            {!isEditor && <button type="button" onClick={openEditorLogin} className="character-editor-login">
              <LockKeyhole className="h-4 w-4" /> Acceso editorial
            </button>}
            {isEditor && <button type="button" onClick={scrollToSubmissions} className="character-signout">
              <FileText className="h-4 w-4" /> <span>Propuestas</span><span className="character-pending-count">{submissions.length}</span>
            </button>}
            {isEditor && <button type="button" onClick={openAddDialog} className="magnetic-button magnetic-button-ghost">
              <Plus className="h-4 w-4" /> Añadir personaje
            </button>}
            <button type="button" onClick={openProposalDialog} className="magnetic-button magnetic-button-primary">
              <Plus className="h-4 w-4" /> Proponer personaje
            </button>
          </div>
        </header>

        <section className="character-intro grid gap-7 py-14 md:grid-cols-[1.05fr_.75fr] md:items-end md:py-20">
          <div>
            <p className="eyebrow mb-5 flex items-center gap-2"><span className="status-dot" /> Direct﻿orio · Bogotá</p>
            <h1 className="font-display text-[clamp(3.3rem,9vw,7.8rem)] font-semibold leading-[.84] tracking-[-.075em]">
              Personajes<br /><span className="text-signal">importantes.</span>
            </h1>
          </div>
          <div className="md:pb-2">
            <p className="max-w-xl text-sm leading-relaxed text-mist-900 md:text-base">Un registro visual de personas clave y sus vínculos públicos. Cualquier visitante puede proponer una ficha; la cuenta editorial decide cuáles se publican.</p>
            <div className="mt-5 flex flex-wrap items-center gap-2 text-[10px] font-mono uppercase tracking-[.14em] text-mist-900">
              <span className="character-meta-chip"><LockKeyhole className="h-3 w-3" /> Publicación moderada</span>
              <span className="character-meta-chip"><FileText className="h-3 w-3" /> {characters.length} {characters.length === 1 ? "ficha" : "fichas"}</span>
            </div>
          </div>
        </section>

        {!client && (
          <Notice tone="info">La base compartida aún no está conectada. El Hub está preparado, pero las fichas y las imágenes sólo estarán disponibles cuando se configure el proyecto Supabase.</Notice>
        )}
        {notice && <Notice tone={notice.tone} onClose={() => setNotice(null)}>{notice.message}</Notice>}
        {loadError && <Notice tone="error" onClose={() => setLoadError(null)}>{loadError}</Notice>}

        <section aria-label="Directorio de personajes" className="mt-7">
          {loading ? (
            <div className="character-empty"><div className="character-empty-mark">···</div><p className="eyebrow mt-4">Conectando con el directorio</p><p className="mt-2 text-sm text-mist-900">Cargando fichas compartidas…</p></div>
          ) : !client ? (
            <div className="character-empty"><div className="character-empty-mark"><FileText className="h-7 w-7" /></div><p className="eyebrow mt-5 text-signal">Hub preparado</p><h2 className="mt-3 font-display text-2xl sm:text-3xl">La conexión común está pendiente.</h2><p className="mt-3 max-w-lg text-sm leading-relaxed text-mist-900">No se guardará información en el navegador. Cuando Supabase quede configurado, aquí aparecerán las mismas fichas para todas las personas.</p></div>
          ) : loadError && characters.length === 0 ? (
            <div className="character-empty"><div className="character-empty-mark"><FileText className="h-7 w-7" /></div><p className="eyebrow mt-5 text-signal">Conexión pendiente de revisar</p><h2 className="mt-3 font-display text-2xl">No se pudieron leer las fichas.</h2><p className="mt-2 text-sm text-mist-900">La página sigue en modo de sólo lectura hasta que la base y sus políticas estén listas.</p></div>
          ) : characters.length === 0 ? (
            <div className="character-empty"><div className="character-empty-mark"><UserRound className="h-7 w-7" /></div><p className="eyebrow mt-5 text-signal">Directorio listo</p><h2 className="mt-3 font-display text-2xl sm:text-3xl">Aún no hay personajes aprobados.</h2><p className="mt-3 max-w-lg text-sm leading-relaxed text-mist-900">Las propuestas sólo aparecerán aquí después de que la cuenta editorial las revise y apruebe.</p>{isEditor && <button type="button" onClick={openAddDialog} className="magnetic-button magnetic-button-ghost mt-6"><Plus className="h-4 w-4" /> Añadir ficha directamente</button>}</div>
          ) : (
            <div className="character-grid">
              {characters.map((character, index) => (
                <CharacterCard key={character.id} character={character} index={index} imageUrl={photoUrl(character.image_path)} canEdit={isEditor} onEdit={() => openEditDialog(character)} />
              ))}
            </div>
          )}
        </section>

        {isEditor && client && <section id="propuestas-pendientes" aria-label="Bandeja privada de propuestas" className="character-review-section mt-16 scroll-mt-8">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-white/10 pb-4">
            <div><p className="eyebrow text-signal">Sólo visible para tu cuenta</p><h2 className="mt-2 font-display text-3xl font-semibold">Propuestas pendientes</h2><p className="mt-2 text-xs text-mist-900">Nada se publica hasta que lo apruebes.</p></div>
            <span className="character-meta-chip"><FileText className="h-3.5 w-3.5" /> {submissions.length} {submissions.length === 1 ? "pendiente" : "pendientes"}</span>
          </div>
          {submissionsError && <Notice tone="error">{submissionsError}</Notice>}
          {submissionsLoading ? <div className="character-review-empty">Cargando propuestas…</div> : submissions.length === 0 ? <div className="character-review-empty">No hay propuestas pendientes por ahora.</div> : <div className="character-review-list">
            {submissions.map((submission) => <ProposalReviewCard key={submission.id} submission={submission} reviewing={reviewingId === submission.id} onReview={reviewSubmission} />)}
          </div>}
        </section>}

        <footer className="mt-20 flex flex-col items-start justify-between gap-3 border-t border-white/10 pt-5 text-[10px] uppercase tracking-[.16em] text-mist-900 sm:flex-row sm:items-center">
          <span>Datos a tener en cuenta · Inteligencia política</span>
          <span>La información de contacto publicada es visible para cualquier visitante</span>
        </footer>
      </div>

      {dialogMode === "login" && <LoginModal onClose={() => setDialogMode(null)} onAuthenticate={authenticateEditor} />}
      {dialogMode === "denied" && <DeniedModal email={session?.user.email ?? null} onClose={() => setDialogMode(null)} onSignOut={signOut} />}
      {dialogMode === "form" && <CharacterFormModal key={editing?.id ?? "new-character"} character={editing} imageUrl={photoUrl(editing?.image_path ?? null)} onClose={() => { setDialogMode(null); setEditing(null); }} onSave={saveCharacter} />}
      {dialogMode === "proposal" && <ProposalFormModal onClose={() => setDialogMode(null)} onSubmit={submitProposal} />}
    </main>
  );
}

function CharacterCard({ character, index, imageUrl, canEdit, onEdit }: { character: CharacterRecord; index: number; imageUrl: string | null; canEdit: boolean; onEdit: () => void }) {
  const facebook = safeExternalUrl(character.facebook_url);
  const instagram = safeExternalUrl(character.instagram_url);
  const xUrl = safeExternalUrl(character.x_url);

  return (
    <article className="character-card" style={{ animationDelay: `${Math.min(index, 10) * 45}ms` }}>
      <div className="character-photo">
        {imageUrl ? <Image src={imageUrl} alt={`Fotografía de ${character.name}`} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" unoptimized className="object-cover" /> : <div className="character-photo-fallback"><UserRound className="h-12 w-12" /><span>Sin fotografía</span></div>}
        <span className="character-type-pill">{character.character_type}</span>
      </div>
      <div className="character-card-body">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0"><p className="eyebrow text-signal">Perfil público</p><h2 className="mt-2 break-words font-display text-2xl font-semibold leading-tight tracking-tight">{character.name}</h2></div>
          <button type="button" onClick={onEdit} className="character-edit-button" aria-label={canEdit ? `Editar ficha de ${character.name}` : `Iniciar sesión para editar ficha de ${character.name}`} title={canEdit ? "Editar ficha" : "Sólo editores autorizados pueden editar"}>{canEdit ? <Pencil className="h-4 w-4" /> : <LockKeyhole className="h-4 w-4" />}<span>Editar</span></button>
        </div>
        <div className="character-contact-line"><Mail className="h-4 w-4 shrink-0 text-signal" /><span className="break-words">{character.contact || "Sin contacto publicado"}</span></div>
        <div className="character-socials" aria-label={`Redes sociales de ${character.name}`}>
          <SocialLink href={facebook} label="Facebook" mark="f" />
          <SocialLink href={instagram} label="Instagram" mark="ig" />
          <SocialLink href={xUrl} label="X" mark="𝕏" />
        </div>
      </div>
    </article>
  );
}

function SocialLink({ href, label, mark }: { href: string | null; label: string; mark: string }) {
  const contents = <><span aria-hidden="true" className="character-social-mark">{mark}</span><span>{label}</span>{href && <ArrowUpRight className="h-3 w-3" />}</>;
  return href ? <a className="character-social-link" href={href} target="_blank" rel="noopener noreferrer" aria-label={`Abrir ${label} en una nueva pestaña`}>{contents}</a> : <span className="character-social-link character-social-link-disabled" aria-label={`${label}: sin enlace publicado`}>{contents}</span>;
}

function LoginModal({ onClose, onAuthenticate }: { onClose: () => void; onAuthenticate: (email: string, password: string) => Promise<void> }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onAuthenticate(email.trim(), password);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No fue posible iniciar sesión.");
    } finally {
      setSubmitting(false);
    }
  }

  return <ModalShell title="Acceso editorial" subtitle="Cualquier persona puede proponer fichas; sólo la única cuenta editorial puede revisarlas y publicarlas." onClose={onClose}>
    <form onSubmit={submit} className="space-y-4">
      <label className="character-field"><span>Correo del editor</span><input type="email" autoComplete="username" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="editor@ejemplo.com" className="character-input" /></label>
      <label className="character-field"><span>Contraseña</span><input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Contraseña de la cuenta editorial" className="character-input" /></label>
      {error && <p role="alert" className="character-form-error">{error}</p>}
      <div className="rounded-xl border border-white/10 bg-white/[.03] p-3 text-xs leading-relaxed text-mist-900"><LockKeyhole className="mr-2 inline h-3.5 w-3.5 text-signal" />No hay registro público. Sólo puede existir una cuenta editorial y debe crearse previamente en Supabase.</div>
      <button type="submit" disabled={submitting} className="magnetic-button magnetic-button-primary w-full justify-center disabled:cursor-wait disabled:opacity-60">{submitting ? "Verificando…" : "Iniciar sesión"}</button>
    </form>
  </ModalShell>;
}

function DeniedModal({ email, onClose, onSignOut }: { email: string | null; onClose: () => void; onSignOut: () => void }) {
  return <ModalShell title="Edición restringida" subtitle="La información del directorio se puede consultar sin iniciar sesión." onClose={onClose}>
    <div className="rounded-2xl border border-amber-200/15 bg-amber-200/[.04] p-4 text-sm leading-relaxed text-mist-700"><LockKeyhole className="mr-2 inline h-4 w-4 text-amber-200" />{email ? `La cuenta ${email} inició sesión, pero no está en la lista de editores autorizados.` : "Esta cuenta no está en la lista de editores autorizados."}</div>
    <div className="mt-5 flex flex-wrap justify-end gap-2"><button type="button" onClick={onClose} className="magnetic-button magnetic-button-ghost">Cerrar</button><button type="button" onClick={onSignOut} className="magnetic-button"><LogOut className="h-4 w-4" /> Cerrar sesión</button></div>
  </ModalShell>;
}

function CharacterFormModal({ character, imageUrl, onClose, onSave }: { character: CharacterRecord | null; imageUrl: string | null; onClose: () => void; onSave: (draft: CharacterDraft, file: File | null) => Promise<void> }) {
  const [draft, setDraft] = useState<CharacterDraft>(() => character ? {
    name: character.name,
    character_type: character.character_type,
    contact: character.contact ?? "",
    facebook_url: character.facebook_url ?? "",
    instagram_url: character.instagram_url ?? "",
    x_url: character.x_url ?? "",
  } : EMPTY_DRAFT);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(imageUrl);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!imageFile) {
      setPreview(imageUrl);
      return;
    }
    const objectUrl = URL.createObjectURL(imageFile);
    setPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [imageFile, imageUrl]);

  function update(field: keyof CharacterDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function chooseImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      setError("Elige una imagen JPG, PNG o WebP.");
      event.target.value = "";
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError("La imagen debe pesar máximo 5 MB para cuidar el espacio gratuito.");
      event.target.value = "";
      return;
    }
    setError(null);
    setImageFile(file);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.name.trim() || !draft.character_type.trim()) {
      setError("Completa el nombre y el tipo de personaje.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSave(draft, imageFile);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No fue posible guardar la ficha.");
    } finally {
      setSubmitting(false);
    }
  }

  return <ModalShell title={character ? "Editar personaje" : "Añadir personaje"} subtitle="Los datos guardados aquí serán visibles para todas las personas que visiten el sitio." onClose={onClose} wide>
    <form onSubmit={submit} className="grid gap-5 md:grid-cols-[.8fr_1.2fr]">
      <div>
        <div className="character-photo-preview">
          {preview ? <img src={preview} alt="Vista previa de la imagen del personaje" /> : <div className="character-photo-fallback"><UserRound className="h-10 w-10" /><span>Sin fotografía</span></div>}
        </div>
        <label className="character-upload-button mt-3"><Upload className="h-4 w-4" /><span>{imageFile ? "Cambiar fotografía" : "Subir fotografía"}</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseImage} /></label>
        <p className="mt-2 text-[11px] leading-relaxed text-mist-900">JPG, PNG o WebP · máximo 5 MB. La foto será pública.</p>
      </div>
      <div className="space-y-3">
        <label className="character-field"><span>Nombre <b>*</b></span><input required maxLength={120} value={draft.name} onChange={(event) => update("name", event.target.value)} placeholder="Nombre y apellido" className="character-input" /></label>
        <label className="character-field"><span>Tipo de personaje <b>*</b></span><input required maxLength={80} value={draft.character_type} onChange={(event) => update("character_type", event.target.value)} placeholder="Ej. líder social, funcionario, candidato…" className="character-input" /></label>
        <label className="character-field"><span>Contacto público</span><input maxLength={300} value={draft.contact} onChange={(event) => update("contact", event.target.value)} placeholder="Correo, teléfono, sitio u otra vía de contacto" className="character-input" /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="character-field"><span>Facebook</span><input type="url" maxLength={300} value={draft.facebook_url} onChange={(event) => update("facebook_url", event.target.value)} placeholder="https://facebook.com/..." className="character-input" /></label>
          <label className="character-field"><span>Instagram</span><input type="url" maxLength={300} value={draft.instagram_url} onChange={(event) => update("instagram_url", event.target.value)} placeholder="https://instagram.com/..." className="character-input" /></label>
        </div>
        <label className="character-field"><span>X</span><input type="url" maxLength={300} value={draft.x_url} onChange={(event) => update("x_url", event.target.value)} placeholder="https://x.com/..." className="character-input" /></label>
        {error && <p role="alert" className="character-form-error">{error}</p>}
        <div className="rounded-xl border border-signal/15 bg-signal/[.04] p-3 text-[11px] leading-relaxed text-mist-900"><ShieldCheck className="mr-2 inline h-3.5 w-3.5 text-signal" />Publica sólo información de contacto y perfiles sociales que esté destinada a ser pública.</div>
        <div className="flex flex-wrap justify-end gap-2 pt-1"><button type="button" onClick={onClose} className="magnetic-button magnetic-button-ghost">Cancelar</button><button type="submit" disabled={submitting} className="magnetic-button magnetic-button-primary disabled:cursor-wait disabled:opacity-60">{submitting ? "Guardando…" : <><Check className="h-4 w-4" /> Guardar ficha</>}</button></div>
      </div>
    </form>
  </ModalShell>;
}

function ProposalFormModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (draft: CharacterProposalDraft) => Promise<void> }) {
  const [draft, setDraft] = useState<CharacterProposalDraft>(EMPTY_PROPOSAL);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(field: keyof CharacterProposalDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.name.trim() || !draft.character_type.trim()) {
      setError("Completa el nombre y el tipo de personaje.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(draft);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No fue posible enviar la propuesta.");
    } finally {
      setSubmitting(false);
    }
  }

  return <ModalShell title="Proponer personaje" subtitle="No necesitas crear una cuenta. La propuesta queda privada y sólo se publica después de la aprobación editorial." onClose={onClose} wide>
    <form onSubmit={submit} className="grid gap-5 md:grid-cols-[1fr_.9fr]">
      <div className="space-y-3">
        <label className="character-field"><span>Nombre <b>*</b></span><input required maxLength={120} value={draft.name} onChange={(event) => update("name", event.target.value)} placeholder="Nombre y apellido" className="character-input" /></label>
        <label className="character-field"><span>Tipo de personaje <b>*</b></span><input required maxLength={80} value={draft.character_type} onChange={(event) => update("character_type", event.target.value)} placeholder="Ej. líder social, funcionario, candidato…" className="character-input" /></label>
        <label className="character-field"><span>Contacto que se podría publicar</span><input maxLength={300} value={draft.contact} onChange={(event) => update("contact", event.target.value)} placeholder="Correo, teléfono o sitio público" className="character-input" /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="character-field"><span>Facebook</span><input type="url" maxLength={300} value={draft.facebook_url} onChange={(event) => update("facebook_url", event.target.value)} placeholder="https://facebook.com/…" className="character-input" /></label>
          <label className="character-field"><span>Instagram</span><input type="url" maxLength={300} value={draft.instagram_url} onChange={(event) => update("instagram_url", event.target.value)} placeholder="https://instagram.com/…" className="character-input" /></label>
        </div>
        <label className="character-field"><span>X</span><input type="url" maxLength={300} value={draft.x_url} onChange={(event) => update("x_url", event.target.value)} placeholder="https://x.com/…" className="character-input" /></label>
      </div>
      <div className="flex flex-col gap-3">
        <label className="character-field"><span>Contexto o fuente para revisión <span className="font-normal text-mist-900">(privado)</span></span><textarea maxLength={1000} rows={7} value={draft.source_note} onChange={(event) => update("source_note", event.target.value)} placeholder="¿Por qué es importante? ¿De dónde proviene la información?" className="character-input character-textarea" /></label>
        <div className="character-review-note"><ShieldCheck className="mr-2 inline h-4 w-4 shrink-0 text-signal" />La ficha y los datos de contacto sólo serán públicos si se aprueban. No envíes información sensible o privada.</div>
        <p className="text-[11px] leading-relaxed text-mist-900">Para evitar subidas anónimas al almacenamiento gratuito, la fotografía la añadirá la cuenta editorial después de aprobar la propuesta.</p>
        <div className="character-honeypot" aria-hidden="true">
          <label htmlFor="proposal-website">Sitio web (dejar vacío)</label>
          <input id="proposal-website" type="text" tabIndex={-1} autoComplete="off" value={draft.website} onChange={(event) => update("website", event.target.value)} />
        </div>
        {error && <p role="alert" className="character-form-error">{error}</p>}
        <div className="mt-auto flex flex-wrap justify-end gap-2 pt-2"><button type="button" onClick={onClose} className="magnetic-button magnetic-button-ghost">Cancelar</button><button type="submit" disabled={submitting} className="magnetic-button magnetic-button-primary disabled:cursor-wait disabled:opacity-60">{submitting ? "Enviando…" : <><Check className="h-4 w-4" /> Enviar propuesta</>}</button></div>
      </div>
    </form>
  </ModalShell>;
}

function ProposalReviewCard({ submission, reviewing, onReview }: { submission: CharacterSubmissionRecord; reviewing: boolean; onReview: (id: string, action: ReviewAction) => void }) {
  const facebook = safeExternalUrl(submission.facebook_url);
  const instagram = safeExternalUrl(submission.instagram_url);
  const xUrl = safeExternalUrl(submission.x_url);
  const submittedAt = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(submission.created_at));

  return <article className="character-review-card">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="eyebrow text-signal">Propuesta recibida</p><h3 className="mt-2 font-display text-xl font-semibold">{submission.name}</h3><p className="mt-1 text-[11px] text-mist-900">{submission.character_type} · {submittedAt}</p></div>
      <span className="character-proposal-status">Pendiente</span>
    </div>
    <div className="mt-4 space-y-2 text-xs leading-relaxed text-mist-700">
      <p><strong className="text-mist-100">Contacto:</strong> {submission.contact || "No indicado"}</p>
      <div className="flex flex-wrap gap-2">
        {facebook && <a href={facebook} target="_blank" rel="noopener noreferrer" className="character-social-link">Facebook <ArrowUpRight className="h-3 w-3" /></a>}
        {instagram && <a href={instagram} target="_blank" rel="noopener noreferrer" className="character-social-link">Instagram <ArrowUpRight className="h-3 w-3" /></a>}
        {xUrl && <a href={xUrl} target="_blank" rel="noopener noreferrer" className="character-social-link">X <ArrowUpRight className="h-3 w-3" /></a>}
        {!facebook && !instagram && !xUrl && <span className="text-mist-900">Sin enlaces de redes</span>}
      </div>
      {submission.source_note && <div className="character-review-note"><FileText className="mr-2 inline h-4 w-4 shrink-0 text-signal" /><span><strong className="text-mist-100">Contexto privado:</strong> {submission.source_note}</span></div>}
    </div>
    <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-white/10 pt-4">
      <button type="button" disabled={reviewing} onClick={() => onReview(submission.id, "reject")} className="character-reject-button disabled:cursor-wait disabled:opacity-50">{reviewing ? "Procesando…" : "Rechazar"}</button>
      <button type="button" disabled={reviewing} onClick={() => onReview(submission.id, "approve")} className="character-approve-button disabled:cursor-wait disabled:opacity-50">{reviewing ? "Procesando…" : <><Check className="h-4 w-4" /> Aprobar y publicar</>}</button>
    </div>
  </article>;
}

function ModalShell({ title, subtitle, onClose, children, wide = false }: { title: string; subtitle: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  const dialogRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const subtitleId = useId();
  onCloseRef.current = onClose;

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousOverflow = document.body.style.overflow;
    const selector = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
    document.body.style.overflow = "hidden";
    dialog.querySelector<HTMLElement>(selector)?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(selector)).filter((element) => element.offsetParent !== null);
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);

  return <div className="character-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={subtitleId} className={`character-modal ${wide ? "character-modal-wide" : ""}`}>
      <div className="mb-5 flex items-start justify-between gap-4"><div><p className="eyebrow text-signal">Directorio · Editores</p><h2 id={titleId} className="mt-2 font-display text-2xl font-semibold">{title}</h2><p id={subtitleId} className="mt-2 max-w-xl text-xs leading-relaxed text-mist-900">{subtitle}</p></div><button type="button" onClick={onClose} aria-label="Cerrar ventana" className="character-close-button"><X className="h-4 w-4" /></button></div>
      {children}
    </section>
  </div>;
}

function Notice({ tone, children, onClose }: { tone: Notice["tone"]; children: React.ReactNode; onClose?: () => void }) {
  return <div role={tone === "error" ? "alert" : "status"} className={`character-notice character-notice-${tone}`}><span>{children}</span>{onClose && <button type="button" aria-label="Cerrar aviso" onClick={onClose} className="ml-3 shrink-0 rounded-md p-1 hover:bg-white/10"><X className="h-3.5 w-3.5" /></button>}</div>;
}

function safeExternalUrl(value: string | null): string | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}
