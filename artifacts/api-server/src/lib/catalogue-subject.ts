import { subjectsTable } from "@workspace/db";

/** Shared catalogue display fields remain neutral until owned progress slices land. */
export function catalogueEnrichment(
  subject: typeof subjectsTable.$inferSelect,
  topicsTotal: number,
) {
  return {
    ...subject,
    syllabusProgress: 0,
    topicsTotal,
    topicsCompleted: 0,
    topicsInProgress: 0,
    upcomingTasksCount: 0,
    recentPaperScore: null,
    recentPaperLabel: null,
  };
}
