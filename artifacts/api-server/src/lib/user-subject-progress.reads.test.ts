import { describe, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { drizzle } from "drizzle-orm/pg-proxy";
import { getUserSubjectProgress } from "./user-subject-progress";

const execute = vi.hoisted(() => vi.fn());
vi.mock("@workspace/db", async (original) => ({
  ...(await original<typeof import("@workspace/db")>()),
  get db() {
    return drizzle(execute);
  },
}));

function caller(subjectId: number) {
  return createClient("http://localhost:54321", "fixture", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: async (input) => {
        const url = new URL(String(input));
        const data = url.pathname.endsWith("/user_subjects")
          ? [{ subject_id: subjectId, syllabus_version_id: 20 }]
          : [{ topic_id: 2, status: "completed", notes: null }];
        return Response.json(data);
      },
    },
  });
}

describe("pinned subject progress catalogue reads", () => {
  it.each([
    [1, "retired", true],
    [1, "published", true],
    [1, "draft", false],
    [2, "published", false],
  ] as const)(
    "checks subject %i and lifecycle %s",
    async (subjectId, lifecycle, valid) => {
      execute.mockReset().mockImplementation(async (sql: string) => {
        if (sql.includes('from "syllabus_topics"')) {
          return {
            rows: [
              [2, 1],
              [3, 1],
            ],
          };
        }
        return { rows: [[20, 1, lifecycle, 1, "Physics", "#111"]] };
      });
      const result = await getUserSubjectProgress(
        caller(subjectId),
        "fixture-user",
      );
      expect(execute).toHaveBeenCalledTimes(2);
      if (valid) {
        expect(result.data?.syllabusCompletion).toEqual([
          {
            subjectId: 1,
            subjectName: "Physics",
            subjectColor: "#111",
            syllabusProgress: 50,
          },
        ]);
      } else {
        expect(result.error?.code).toBe("PIN_INVARIANT");
      }
    },
  );
});
