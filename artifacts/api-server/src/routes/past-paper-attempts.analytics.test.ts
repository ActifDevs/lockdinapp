import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";

const getClaims = vi.fn();
const from = vi.fn();
const trackPastPaperAttemptCreated = vi.fn();

vi.mock("../lib/supabase-verifier.js", () => ({
  getSupabaseVerifier: () => ({
    auth: { getClaims },
  }),
}));

vi.mock("../lib/supabase-user-client.js", () => ({
  createUserScopedSupabaseClient: () => ({ from }),
}));

vi.mock("../lib/logger.js", () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}));

vi.mock("../lib/pin-reference-writes.js", () => ({
  assertComponentOnCallerPin: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock("@workspace/db", () => {
  const chain = (result: unknown) => {
    const query = {
      from: () => query,
      innerJoin: () => query,
      where: async () => result,
    };
    return query;
  };
  return {
    db: {
      select: (shape: { id?: unknown; subjectId?: unknown }) => {
        if (shape && "subjectId" in shape) {
          return chain([{ id: 10, subjectId: 1 }]);
        }
        return chain([{ id: 1 }]);
      },
    },
    subjectsTable: { id: "id" },
    assessmentComponentsTable: { id: "id", syllabusVersionId: "sv" },
    syllabusVersionsTable: { id: "id", subjectId: "sid" },
  };
});

vi.mock("../lib/past-paper-attempts", () => ({
  PAST_PAPER_ATTEMPT_SELECT:
    "id, user_id, subject_id, component_id, variant, session, year, score, total_marks, percentage, date_attempted, time_taken_minutes, notes, created_at",
  enrichPastPaperRows: async (rows: Array<Record<string, unknown>>) =>
    rows.map((row) => ({
      id: row.id,
      subjectId: row.subject_id,
      subjectName: "Physics",
      subjectColor: "#000",
      componentId: row.component_id,
      componentName: "Paper 1",
      variant: row.variant,
      session: row.session,
      year: row.year,
      paperLabel: "P1",
      score: row.score,
      totalMarks: row.total_marks,
      percentage: row.percentage,
      dateAttempted: row.date_attempted,
      timeTakenMinutes: row.time_taken_minutes,
      notes: row.notes,
      createdAt: row.created_at,
    })),
  listUserPastPaperRows: vi.fn(),
}));

vi.mock("../lib/analytics/index.js", () => ({
  fireAndForgetAnalytics: async (work: () => Promise<void>) => {
    try {
      await work();
    } catch {
      // product writes must not fail
    }
  },
  trackPastPaperAttemptCreated: (...args: unknown[]) =>
    trackPastPaperAttemptCreated(...args),
}));

const USER = "02444f79-c2bb-4596-ae99-d5d6877f1001";

function mockInsertOk() {
  from.mockReturnValue({
    insert: () => ({
      select: () => ({
        single: async () => ({
          data: {
            id: 3,
            user_id: USER,
            subject_id: 1,
            component_id: 10,
            variant: null,
            session: "May/June",
            year: 2024,
            score: 40,
            total_marks: 50,
            percentage: 80,
            date_attempted: "2026-08-01",
            time_taken_minutes: null,
            notes: "keep out of analytics",
            created_at: "2026-08-30T00:00:00Z",
          },
          error: null,
        }),
      }),
    }),
  });
}

const body = {
  subjectId: 1,
  componentId: 10,
  session: "May/June",
  year: 2024,
  score: 40,
  totalMarks: 50,
  dateAttempted: "2026-08-01",
};

describe("past-paper attempt analytics", () => {
  let app: express.Express;

  beforeAll(async () => {
    const { default: router } = await import("./pastPaperAttempts.js");
    app = express();
    app.use(express.json());
    app.use("/api", router);
  });

  beforeEach(() => {
    getClaims.mockReset();
    from.mockReset();
    trackPastPaperAttemptCreated.mockReset();
    getClaims.mockResolvedValue({
      data: { claims: { sub: USER } },
      error: null,
    });
    mockInsertOk();
  });

  it("emits past_paper_attempt_created on every successful create, not 0→1", async () => {
    trackPastPaperAttemptCreated.mockResolvedValue(undefined);
    const first = await request(app)
      .post("/api/past-paper-attempts")
      .set("Authorization", "Bearer good-token")
      .send(body);
    const second = await request(app)
      .post("/api/past-paper-attempts")
      .set("Authorization", "Bearer good-token")
      .send(body);
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(trackPastPaperAttemptCreated).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(trackPastPaperAttemptCreated.mock.calls)).not.toMatch(
      /keep out of analytics|40|80/,
    );
  });

  it("still creates the attempt when PostHog throws", async () => {
    trackPastPaperAttemptCreated.mockRejectedValue(new Error("posthog down"));
    const res = await request(app)
      .post("/api/past-paper-attempts")
      .set("Authorization", "Bearer good-token")
      .send(body);
    expect(res.status).toBe(201);
  });
});
