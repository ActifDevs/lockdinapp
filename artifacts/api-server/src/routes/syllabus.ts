import { Router, type IRouter } from "express";
import { temporarilyUnavailableBody } from "../lib/feature-quarantine";

const router: IRouter = Router();

/**
 * Disabled until user-owned syllabus progress exists.
 * syllabus_topics.status / notes are currently shared student-progress fields
 * and must not be mutated through the API.
 */
router.patch("/syllabus-topics/:topicId", async (_req, res): Promise<void> => {
  res.status(503).json(temporarilyUnavailableBody());
});

export default router;
