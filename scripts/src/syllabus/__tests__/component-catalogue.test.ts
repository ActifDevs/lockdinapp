import { describe, expect, it } from "vitest";
import {
  loadComponentCatalogue,
} from "../component-catalogue.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");

describe("component catalogue", () => {
  it("loads the approved 9489-r002 catalogue with P1–P4", () => {
    const catalogue = loadComponentCatalogue(
      path.join(
        ROOT,
        "docs/reference-data/component-catalogues/9489-r002.component-catalogue.json",
      ),
    );
    expect(catalogue.subjectCode).toBe("9489");
    expect(catalogue.syllabusRevisionKey).toBe("9489-r002");
    expect(catalogue.components.map((c) => c.paperCode)).toEqual([
      "9489/1",
      "9489/2",
      "9489/3",
      "9489/4",
    ]);
  });
});
