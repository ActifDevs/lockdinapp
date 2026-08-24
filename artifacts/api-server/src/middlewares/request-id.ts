import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";

/** Generate the server-authoritative ID used by Pino and the response. */
export function generateRequestId(): string {
  return randomUUID();
}

/** Expose the request ID already assigned by pino-http. */
export const requestIdHeader: RequestHandler = (req, res, next) => {
  res.setHeader("X-Request-Id", String(req.id));
  next();
};
