import { describe, expect, it } from "vitest";
import { runRouteManifestCli } from "../cli.js";
import { baseStaticManifest } from "./fixtures/synthetic.js";

describe("route-manifest CLI", () => {
  it("validates and hashes through CLI modes", async () => {
    const logs: string[] = [];
    const errors: string[] = [];
    const output = {
      log: (message: string) => logs.push(String(message)),
      error: (message: string) => errors.push(String(message)),
    };
    const raw = baseStaticManifest();

    const validateCode = await runRouteManifestCli(
      ["--mode=validate", "--file=synthetic.json"],
      {
        output,
        readJson: () => raw,
      },
    );
    expect(validateCode).toBe(0);
    expect(logs.some((line) => line.includes("PASS"))).toBe(true);

    logs.length = 0;
    const hashCode = await runRouteManifestCli(
      ["--mode=hash", "--file=synthetic.json"],
      {
        output,
        readJson: () => raw,
      },
    );
    expect(hashCode).toBe(0);
    expect(logs[0]).toMatch(/^[a-f0-9]{64}$/);

    const failCode = await runRouteManifestCli(
      ["--mode=validate", "--file=bad.json"],
      {
        output,
        readJson: () => ({ ...raw, unexpectedField: 1 }),
      },
    );
    expect(failCode).toBe(1);
    expect(errors.some((line) => line.includes("FAIL"))).toBe(true);
  });
});
