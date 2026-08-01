import type { Response } from "express";
import { logger } from "./logger";

export type MappedSupabaseError = {
  status: 400 | 401 | 404 | 500;
  error: string;
};

/**
 * Map PostgREST / Supabase client errors into the existing API error shape
 * without leaking database, JWT, RLS, or Supabase internals.
 */
export function mapSupabaseError(error: {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
  status?: number;
}): MappedSupabaseError {
  const code = error.code ?? "";
  const status = error.status;

  if (status === 401 || code === "PGRST301" || code === "42501") {
    // 42501 can be RLS or privilege denial — for authenticated task routes
    // treat inaccessible rows as 404 to avoid disclosing existence/ownership.
    if (code === "42501") {
      return { status: 404, error: "Task not found" };
    }
    return { status: 401, error: "Unauthorized" };
  }

  // PostgREST / Postgres: no rows for .single(), FK / check violations, etc.
  if (
    code === "PGRST116" ||
    code === "22P02" ||
    status === 404
  ) {
    return { status: 404, error: "Task not found" };
  }

  if (
    code === "23503" ||
    code === "23514" ||
    code === "23502" ||
    code === "PGRST102" ||
    status === 400
  ) {
    return { status: 400, error: "Invalid request" };
  }

  return { status: 500, error: "Internal server error" };
}

export function sendSupabaseError(
  res: Response,
  error: {
    code?: string;
    message?: string;
    details?: string;
    hint?: string;
    status?: number;
  },
  context: string,
): void {
  const mapped = mapSupabaseError(error);
  logger.error(
    {
      context,
      supabaseCode: error.code,
      status: mapped.status,
    },
    "Supabase Data API error",
  );
  res.status(mapped.status).json({ error: mapped.error });
}
