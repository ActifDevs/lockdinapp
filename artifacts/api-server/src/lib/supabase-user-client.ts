import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServerConfig } from "./supabase-config";

/**
 * Create a strictly request-scoped Supabase client that carries this request's
 * Bearer token. Never mutate a module-level Authorization header.
 */
export function createUserScopedSupabaseClient(accessToken: string): SupabaseClient {
  const { url, publishableKey } = getSupabaseServerConfig();

  return createClient(url, publishableKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
