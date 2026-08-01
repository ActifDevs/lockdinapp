/**
 * Server-side Supabase configuration.
 *
 * Uses SUPABASE_URL + SUPABASE_PUBLISHABLE_KEY only. Never reads VITE_* values
 * and never requires the service-role key for ordinary request authentication.
 */

export type SupabaseServerConfig = {
  url: string;
  publishableKey: string;
};

export function getSupabaseServerConfig(): SupabaseServerConfig {
  const url = process.env.SUPABASE_URL?.trim();
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url || !publishableKey) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY are required for authenticated API routes",
    );
  }

  return { url, publishableKey };
}
