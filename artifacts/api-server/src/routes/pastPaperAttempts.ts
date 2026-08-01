import { Router, type IRouter } from "express";
import {
  ListPastPaperAttemptsQueryParams,
  ListPastPaperAttemptsResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/require-auth";
import { temporarilyUnavailableBody } from "../lib/feature-quarantine";

const router: IRouter = Router();

/**
 * Quarantined: past_paper_attempts have no user ownership yet.
 * Authenticated reads return []; writes/deletes are blocked. No table queries.
 */

router.get("/past-paper-attempts", requireAuth, async (req, res): Promise<void> => {
  const queryParams = ListPastPaperAttemptsQueryParams.safeParse(req.query);
  if (!queryParams.success) {
    res.status(400).json({ error: queryParams.error.message });
    return;
  }

  res.json(ListPastPaperAttemptsResponse.parse([]));
});

router.post("/past-paper-attempts", requireAuth, async (_req, res): Promise<void> => {
  res.status(503).json(temporarilyUnavailableBody());
});

router.delete(
  "/past-paper-attempts/:pastPaperAttemptId",
  requireAuth,
  async (_req, res): Promise<void> => {
    res.status(503).json(temporarilyUnavailableBody());
  },
);

export default router;
