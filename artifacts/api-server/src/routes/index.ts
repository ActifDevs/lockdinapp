import { Router, type IRouter } from "express";
import healthRouter from "./health";
import subjectsRouter from "./subjects";
import syllabusRouter from "./syllabus";
import tasksRouter from "./tasks";
import pastPapersRouter from "./pastPapers";
import examDatesRouter from "./examDates";
import dashboardRouter from "./dashboard";
import progressRouter from "./progress";

const router: IRouter = Router();

router.use(healthRouter);
router.use(subjectsRouter);
router.use(syllabusRouter);
router.use(tasksRouter);
router.use(pastPapersRouter);
router.use(examDatesRouter);
router.use(dashboardRouter);
router.use(progressRouter);

export default router;
