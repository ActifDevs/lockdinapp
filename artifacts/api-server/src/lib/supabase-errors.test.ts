import { describe, expect, it } from "vitest";
import { mapSupabaseError } from "./supabase-errors";

describe("mapSupabaseError", () => {
  it("maps missing-row codes to non-disclosing 404", () => {
    expect(mapSupabaseError({ code: "PGRST116" }, "Task")).toEqual({
      status: 404,
      error: "Task not found",
    });
  });

  it("maps privilege/RLS denial to a resource-aware nondisclosing 404", () => {
    expect(mapSupabaseError({ code: "42501" }, "Past-paper attempt")).toEqual({
      status: 404,
      error: "Past-paper attempt not found",
    });
  });

  it("uses a generic resource message when no route context is supplied", () => {
    expect(mapSupabaseError({ status: 404 })).toEqual({
      status: 404,
      error: "Resource not found",
    });
  });

  it("maps malformed identifiers to 400", () => {
    expect(mapSupabaseError({ code: "22P02" })).toEqual({
      status: 400,
      error: "Invalid request",
    });
  });

  it("maps FK/check failures to 400", () => {
    expect(mapSupabaseError({ code: "23503" }).status).toBe(400);
    expect(mapSupabaseError({ code: "23514" }).status).toBe(400);
  });

  it("maps unexpected failures to generic 500", () => {
    expect(mapSupabaseError({ code: "XX000", message: "boom" })).toEqual({
      status: 500,
      error: "Internal server error",
    });
  });

  it("never echoes Supabase internals in the client message", () => {
    const mapped = mapSupabaseError(
      {
        code: "42501",
        message: 'new row violates row-level security policy for table "tasks"',
        hint: "Grant SELECT ON public.tasks TO anon",
      },
      "Task",
    );
    expect(mapped.error).toBe("Task not found");
    expect(mapped.error).not.toMatch(/row-level|Grant|tasks/i);
  });
});
