import { describe, expect, it, vi } from "vitest";

const createClient = vi.fn((..._args: unknown[]) => ({ id: Math.random() }));

vi.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => createClient(...args),
}));

vi.mock("./supabase-config.js", () => ({
  getSupabaseServerConfig: () => ({
    url: "http://127.0.0.1:54321",
    publishableKey: "test-publishable-key",
  }),
}));

import { createUserScopedSupabaseClient } from "./supabase-user-client.js";

describe("createUserScopedSupabaseClient", () => {
  it("creates a new client per call with that request's Bearer token only", () => {
    createClient.mockClear();

    const clientA = createUserScopedSupabaseClient("token-a");
    const clientB = createUserScopedSupabaseClient("token-b");

    expect(createClient).toHaveBeenCalledTimes(2);
    expect(clientA).not.toBe(clientB);

    const optsA = createClient.mock.calls[0][2] as {
      global: { headers: { Authorization: string } };
    };
    const optsB = createClient.mock.calls[1][2] as {
      global: { headers: { Authorization: string } };
    };

    expect(optsA.global.headers.Authorization).toBe("Bearer token-a");
    expect(optsB.global.headers.Authorization).toBe("Bearer token-b");
    // Concurrent construction must not share / overwrite a module-level header.
    expect(optsA.global.headers.Authorization).not.toBe(
      optsB.global.headers.Authorization,
    );
  });
});
