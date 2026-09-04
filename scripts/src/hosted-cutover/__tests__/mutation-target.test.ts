import { afterEach, describe, expect, it } from "vitest";
import {
  assertCatalogueMutationAuthorized,
  resolveMutationTargetMode,
} from "../mutation-target.js";
import {
  HOSTED_CUTOVER_FLAG,
  KNOWN_HOSTED_PROJECT_REF,
} from "../safety-gate.js";
import {
  assertHostedRoutePublicationAllowed,
  assertLocalRoutePublicationAllowed,
} from "../../route-manifest/publish-safety.js";
import { RouteManifestError } from "../../route-manifest/errors.js";

const HOSTED_URL =
  "postgresql://postgres.hazvcdrcvsxmuwdfiucx:x@aws-0-eu-west-1.pooler.supabase.com:5432/postgres";
const LOCAL_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

function setValidHostedEnv(): void {
  process.env[HOSTED_CUTOVER_FLAG] = "1";
  process.env.LOCKDIN_EXPECTED_PROJECT_REF = KNOWN_HOSTED_PROJECT_REF;
  process.env.LOCKDIN_ACTUAL_PROJECT_REF = KNOWN_HOSTED_PROJECT_REF;
  process.env.DATABASE_URL = HOSTED_URL;
  process.env.LOCKDIN_EXPECTED_REPOSITORY_COMMIT = "a".repeat(40);
  process.env.LOCKDIN_ACTUAL_REPOSITORY_COMMIT = "a".repeat(40);
  process.env.LOCKDIN_EXPECTED_MIGRATION_HEAD =
    "0018_subject_visibility_and_route_assignment";
  process.env.LOCKDIN_ACTUAL_MIGRATION_HEAD =
    "0018_subject_visibility_and_route_assignment";
  process.env.LOCKDIN_HOSTED_BACKUP_CONFIRMED = "1";
  process.env.LOCKDIN_EXPECTED_PRECUTOVER_FINGERPRINT = "fp";
  process.env.LOCKDIN_ACTUAL_PRECUTOVER_FINGERPRINT = "fp";
}

describe("permanent hosted catalogue mutation wiring", () => {
  const keys = [
    HOSTED_CUTOVER_FLAG,
    "LOCKDIN_EXPECTED_PROJECT_REF",
    "LOCKDIN_ACTUAL_PROJECT_REF",
    "DATABASE_URL",
    "DIRECT_DATABASE_URL",
    "LOCKDIN_EXPECTED_REPOSITORY_COMMIT",
    "LOCKDIN_ACTUAL_REPOSITORY_COMMIT",
    "LOCKDIN_EXPECTED_MIGRATION_HEAD",
    "LOCKDIN_ACTUAL_MIGRATION_HEAD",
    "LOCKDIN_HOSTED_BACKUP_CONFIRMED",
    "LOCKDIN_EXPECTED_PRECUTOVER_FINGERPRINT",
    "LOCKDIN_ACTUAL_PRECUTOVER_FINGERPRINT",
    "LOCKDIN_ALLOW_LOCAL_ROUTE_PUBLICATION",
  ] as const;
  const originals: Record<string, string | undefined> = {};

  afterEach(() => {
    for (const key of keys) {
      if (originals[key] === undefined) delete process.env[key];
      else process.env[key] = originals[key];
    }
  });

  for (const key of keys) {
    originals[key] = process.env[key];
  }

  it("resolves hosted mode only from --hosted-cutover", () => {
    expect(resolveMutationTargetMode([])).toBe("local");
    expect(resolveMutationTargetMode(["--hosted-cutover"])).toBe(
      "hosted-cutover",
    );
  });

  it("denies hosted mode when master flag missing even with DATABASE_URL set", () => {
    setValidHostedEnv();
    delete process.env[HOSTED_CUTOVER_FLAG];
    expect(() =>
      assertCatalogueMutationAuthorized({ argv: ["--hosted-cutover"] }),
    ).toThrow(/missing LOCKDIN_ALLOW_HOSTED_CATALOGUE_CUTOVER/);
  });

  it("denies wrong project / commit / migration / fingerprint / backup", () => {
    setValidHostedEnv();
    process.env.LOCKDIN_ACTUAL_PROJECT_REF = "other";
    expect(() =>
      assertCatalogueMutationAuthorized({ argv: ["--hosted-cutover"] }),
    ).toThrow(/wrong_project_ref/);

    setValidHostedEnv();
    process.env.LOCKDIN_ACTUAL_REPOSITORY_COMMIT = "b".repeat(40);
    expect(() =>
      assertCatalogueMutationAuthorized({ argv: ["--hosted-cutover"] }),
    ).toThrow(/wrong_repository_commit/);

    setValidHostedEnv();
    process.env.LOCKDIN_ACTUAL_MIGRATION_HEAD = "0017_route_reference_immutability";
    expect(() =>
      assertCatalogueMutationAuthorized({ argv: ["--hosted-cutover"] }),
    ).toThrow(/wrong_migration_head/);

    setValidHostedEnv();
    process.env.LOCKDIN_ACTUAL_PRECUTOVER_FINGERPRINT = "nope";
    expect(() =>
      assertCatalogueMutationAuthorized({ argv: ["--hosted-cutover"] }),
    ).toThrow(/pre_cutover_fingerprint_mismatch/);

    setValidHostedEnv();
    delete process.env.LOCKDIN_HOSTED_BACKUP_CONFIRMED;
    expect(() =>
      assertCatalogueMutationAuthorized({ argv: ["--hosted-cutover"] }),
    ).toThrow(/missing_backup_acknowledgement/);
  });

  it("denies wrong database host", () => {
    setValidHostedEnv();
    process.env.DATABASE_URL =
      "postgresql://postgres.other:x@aws-0-eu-west-1.pooler.supabase.com:5432/postgres";
    expect(() =>
      assertCatalogueMutationAuthorized({ argv: ["--hosted-cutover"] }),
    ).toThrow(/wrong_database_host/);
  });

  it("allows correct fully mocked hosted authorization via env auto-load", () => {
    setValidHostedEnv();
    expect(() =>
      assertCatalogueMutationAuthorized({ argv: ["--hosted-cutover"] }),
    ).not.toThrow();
  });

  it("keeps local path loopback-only and separate from hosted gate", () => {
    process.env.DATABASE_URL = HOSTED_URL;
    process.env.LOCKDIN_ALLOW_LOCAL_ROUTE_PUBLICATION = "1";
    expect(() => assertCatalogueMutationAuthorized({ argv: [] })).toThrow(
      /loopback/,
    );

    process.env.DATABASE_URL = LOCAL_URL;
    expect(() => assertCatalogueMutationAuthorized({ argv: [] })).not.toThrow();
  });

  it("denies local route gate against hosted target", () => {
    process.env.LOCKDIN_ALLOW_LOCAL_ROUTE_PUBLICATION = "1";
    process.env.DATABASE_URL = HOSTED_URL;
    expect(() => assertLocalRoutePublicationAllowed([])).toThrow(
      /loopback DATABASE_URL/,
    );
  });

  it("denies hosted route path without --hosted-cutover", () => {
    setValidHostedEnv();
    expect(() => assertHostedRoutePublicationAllowed({ argv: [] })).toThrow(
      RouteManifestError,
    );
  });

  it("denies hosted route path when gate incomplete", () => {
    setValidHostedEnv();
    delete process.env[HOSTED_CUTOVER_FLAG];
    expect(() =>
      assertHostedRoutePublicationAllowed({ argv: ["--hosted-cutover"] }),
    ).toThrow(/hosted_publication_unauthorized|missing/);
  });

  it("allows hosted route path with valid env gate", () => {
    setValidHostedEnv();
    expect(() =>
      assertHostedRoutePublicationAllowed({ argv: ["--hosted-cutover"] }),
    ).not.toThrow();
  });
});
