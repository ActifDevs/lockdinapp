import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServerConfig } from "./supabase-config";

/**
 * Stateless JWT verifier client (publishable key).
 *
 * Used only for `auth.getClaims(token)`. It does not carry a per-request
 * Authorization header and must never be mutated for Data API calls.
 */
let verifier: SupabaseClient | null = null;

export function getSupabaseVerifier(): SupabaseClient {
  if (!verifier) {
    const { url, publishableKey } = getSupabaseServerConfig();
    verifier = createClient(url, publishableKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }
  return verifier;
}

/** Reset cached verifier — for tests only. */
export function resetSupabaseVerifierForTests(): void {
  verifier = null;
}
