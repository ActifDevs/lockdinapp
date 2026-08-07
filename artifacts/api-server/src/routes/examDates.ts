import { Router, type IRouter } from "express";
import { ListExamDatesResponse } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/require-auth";
import { temporarilyUnavailableBody } from "../lib/feature-quarantine";

const router: IRouter = Router();

/**
 * Quarantined: exam_dates have no user ownership yet.
 * Authenticated reads return []; writes/deletes are blocked. No table queries.
 */

router.get("/exam-dates", requireAuth, async (_req, res): Promise<void> => {
  res.json(ListExamDatesResponse.parse([]));
});

router.post("/exam-dates", requireAuth, async (_req, res): Promise<void> => {
  res.status(503).json(temporarilyUnavailableBody());
});

router.delete("/exam-dates/:examDateId", requireAuth, async (_req, res): Promise<void> => {
  res.status(503).json(temporarilyUnavailableBody());
});

export default router;
