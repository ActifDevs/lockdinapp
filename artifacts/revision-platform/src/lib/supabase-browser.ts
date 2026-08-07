import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

/**
 * Single browser Supabase client for Auth.
 * Uses publishable key only — never a service-role key.
 */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (browserClient) return browserClient;

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (typeof supabaseUrl !== "string" || supabaseUrl.trim() === "") {
    throw new Error(
      "Missing VITE_SUPABASE_URL. Set it in the environment before starting the app.",
    );
  }
  if (typeof publishableKey !== "string" || publishableKey.trim() === "") {
    throw new Error(
      "Missing VITE_SUPABASE_PUBLISHABLE_KEY. Set it in the environment before starting the app.",
    );
  }

  browserClient = createClient(supabaseUrl, publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return browserClient;
}

/** Test-only reset. */
export function __resetSupabaseBrowserClientForTests(): void {
  browserClient = null;
}
