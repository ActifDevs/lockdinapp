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
export function mapSupabaseError(
  error: {
    code?: string;
    message?: string;
    details?: string;
    hint?: string;
    status?: number;
  },
  resource?: string,
): MappedSupabaseError {
  const code = error.code ?? "";
  const status = error.status;
  const notFound = resource ? `${resource} not found` : "Resource not found";

  if (code === "42501") {
    return { status: 404, error: notFound };
  }

  if (status === 401 || code === "PGRST301") {
    return { status: 401, error: "Unauthorized" };
  }

  if (code === "PGRST116" || status === 404) {
    return { status: 404, error: notFound };
  }

  if (
    code === "22P02" ||
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
  resource?: string,
): void {
  const mapped = mapSupabaseError(error, resource);
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
