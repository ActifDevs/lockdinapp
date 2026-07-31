import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/healthz/db", async (_req, res): Promise<void> => {
  try {
    await db.execute(sql`select 1`);
    res.json({
      status: "ok",
      database: "ok",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown database error";
    res.status(503).json({
      status: "degraded",
      database: "down",
      message,
    });
  }
});

export default router;
