import { Router, type IRouter } from "express";
import healthRouter from "./health";
import subjectsRouter from "./subjects";
import syllabusRouter from "./syllabus";
import tasksRouter from "./tasks";
import pastPaperAttemptsRouter from "./pastPaperAttempts";
import examDatesRouter from "./examDates";
import dashboardRouter from "./dashboard";
import progressRouter from "./progress";
import profileRouter from "./profile";
import userSubjectsRouter from "./user-subjects";
import analyticsRouter from "./analytics";

const router: IRouter = Router();

router.use(healthRouter);
router.use(subjectsRouter);
router.use(syllabusRouter);
router.use(tasksRouter);
router.use(pastPaperAttemptsRouter);
router.use(examDatesRouter);
router.use(dashboardRouter);
router.use(progressRouter);
router.use(profileRouter);
router.use(userSubjectsRouter);
router.use(analyticsRouter);

export default router;
