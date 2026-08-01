import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  customFetch,
  setAuthTokenGetter,
  setUnauthorizedHandler,
} from "@workspace/api-client-react";

describe("customFetch unauthorized handler", () => {
  afterEach(() => {
    setUnauthorizedHandler(null);
    setAuthTokenGetter(null);
    vi.unstubAllGlobals();
  });

  it("schedules the handler on 401 and still throws ApiError", async () => {
    const handler = vi.fn(async () => undefined);
    setUnauthorizedHandler(handler);

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          statusText: "Unauthorized",
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    await expect(customFetch("/api/profile")).rejects.toBeInstanceOf(ApiError);
    await new Promise((r) => queueMicrotask(r));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("does not call the handler on 403", async () => {
    const handler = vi.fn(async () => undefined);
    setUnauthorizedHandler(handler);

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          statusText: "Forbidden",
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    await expect(customFetch("/api/profile")).rejects.toBeInstanceOf(ApiError);
    await new Promise((r) => queueMicrotask(r));
    expect(handler).not.toHaveBeenCalled();
  });

  it("handler failure does not replace the ApiError", async () => {
    setUnauthorizedHandler(() => {
      throw new Error("handler boom");
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          statusText: "Unauthorized",
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    await expect(customFetch("/api/x")).rejects.toMatchObject({
      status: 401,
      name: "ApiError",
    });
    await new Promise((r) => queueMicrotask(r));
  });

  it("keeps an explicit Authorization header", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      expect(headers.get("authorization")).toBe("Bearer explicit-token");
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    setAuthTokenGetter(() => "getter-token");

    await customFetch("/api/x", {
      headers: { Authorization: "Bearer explicit-token" },
    });
    expect(fetchMock).toHaveBeenCalled();
  });
});
