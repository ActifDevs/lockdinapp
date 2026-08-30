import { Router, type IRouter } from "express";
import { ReportAccountCreatedBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/require-auth";
import { hasOwnershipField } from "../lib/topic-progress";
import {
  fireAndForgetAnalytics,
  trackAccountCreated,
} from "../lib/analytics/index.js";

const router: IRouter = Router();

function isEmptyAnalyticsBody(body: unknown): boolean {
  if (body == null) {
    return true;
  }
  if (typeof body !== "object" || Array.isArray(body)) {
    return false;
  }
  return Object.keys(body).length === 0;
}

router.post("/analytics/account-created", requireAuth, async (req, res): Promise<void> => {
  if (hasOwnershipField(req.body) || !isEmptyAnalyticsBody(req.body)) {
    res.status(400).json({ error: "Request body must be empty" });
    return;
  }

  const parsed = ReportAccountCreatedBody.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  res.status(204).send();
  await fireAndForgetAnalytics(() =>
    trackAccountCreated({ userId: req.userId! }),
  );
});

export default router;
