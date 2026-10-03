import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const CHARACTER_PHOTOS_BUCKET = "character-photos";

let client: SupabaseClient | null | undefined;

function isBrowserSafeKey(key: string): boolean {
  if (key.startsWith("sb_publishable_")) return true;
  if (!key.startsWith("eyJ")) return false;

  try {
    const encodedPayload = key.split(".")[1];
    if (!encodedPayload) return false;
    const base64 = encodedPayload.replace(/-/g, "+").replace(/_/g, "/");
    const claims = JSON.parse(globalThis.atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")));
    return claims.role === "anon";
  } catch {
    return false;
  }
}

/**
 * Supabase's publishable (or legacy anon) key is intended for browser use.
 * Database and Storage RLS policies, not a secret in the bundle, enforce access.
 * Never replace this with a service_role/secret key.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (client !== undefined) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )?.trim();

  client = url && key && url.startsWith("https://") && isBrowserSafeKey(key)
    ? createClient(url, key)
    : null;

  if (url && key && !client) {
    console.error("Supabase client was not initialized: use an HTTPS project URL and a publishable/anon browser key.");
  }
  return client;
}
