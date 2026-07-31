import type { ErrorRequestHandler } from "express";
import { logger } from "./logger";

/**
 * Final Express error middleware. Unhandled route/async failures used to surface
 * as Vercel HTML "Internal Server Error" with no structured payload. This keeps
 * the client contract JSON-shaped and logs the underlying exception for operators.
 */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const error = err instanceof Error ? err : new Error(String(err));
  const cause =
    error.cause instanceof Error
      ? { message: error.cause.message, name: error.cause.name }
      : error.cause ?? undefined;

  logger.error(
    {
      err: {
        message: error.message,
        name: error.name,
        stack: error.stack,
        cause,
      },
      req: {
        method: req.method,
        url: req.originalUrl?.split("?")[0] ?? req.url?.split("?")[0],
      },
    },
    "Unhandled API error",
  );

  if (res.headersSent) {
    return;
  }

  res.status(500).json({
    error: "Internal server error",
  });
};
