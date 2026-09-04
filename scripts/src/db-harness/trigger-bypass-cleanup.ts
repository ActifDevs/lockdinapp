import type { Pool, PoolClient } from "pg";

const ROUTE_REFERENCE_TABLES = [
  "assessment_study_option_year_mappings",
  "assessment_study_option_units",
  "assessment_study_options",
  "assessment_study_option_groups",
  "assessment_route_components",
  "assessment_routes",
  "assessment_route_sets",
] as const;

/**
 * Test-only teardown helper. Published/retired route-reference DELETE is blocked
 * by migration 0017 triggers. Disposable synthetic fixtures temporarily disable
 * USER triggers on route-reference tables inside a transaction.
 *
 * Never use this path for production/hosted mutation.
 */
export async function withTriggerBypassCleanup(
  pool: Pool,
  operation: (client: PoolClient) => Promise<void>,
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const table of ROUTE_REFERENCE_TABLES) {
      await client.query(
        `ALTER TABLE public.${table} DISABLE TRIGGER USER`,
      );
    }
    await operation(client);
    for (const table of ROUTE_REFERENCE_TABLES) {
      await client.query(
        `ALTER TABLE public.${table} ENABLE TRIGGER USER`,
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
