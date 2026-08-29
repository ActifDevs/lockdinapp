import { Pool } from "pg";

/** Reset only the disposable application's public schema; Supabase schemas stay intact. */
export async function ensureCleanPublicSchema(pool: Pool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DROP SCHEMA IF EXISTS public CASCADE");
    await client.query("CREATE SCHEMA public AUTHORIZATION postgres");
    await client.query(
      "GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role",
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
