import { describe, expect, it } from "vitest";
import {
  HOSTED_CUTOVER_FLAG,
  KNOWN_HOSTED_PROJECT_REF,
  assertDatabaseMutationTargetAllowed,
  checkHostedCatalogueCutoverGate,
  hostedCutoverGateInputFromEnv,
} from "../safety-gate.js";

const valid = {
  allowFlag: "1" as const,
  expectedProjectRef: KNOWN_HOSTED_PROJECT_REF,
  actualProjectRef: KNOWN_HOSTED_PROJECT_REF,
  databaseUrl:
    "postgresql://postgres.hazvcdrcvsxmuwdfiucx:x@aws-0-eu-west-1.pooler.supabase.com:5432/postgres",
  expectedRepositoryCommit:
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  actualRepositoryCommit: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  expectedMigrationHead: "0018_subject_visibility_and_route_assignment",
  actualMigrationHead: "0018_subject_visibility_and_route_assignment",
  backupAcknowledged: true,
  expectedFingerprint: "abc",
  actualFingerprint: "abc",
};

describe("hosted catalogue cutover gate (dynamic expectations)", () => {
  it("denies missing flag", () => {
    expect(
      checkHostedCatalogueCutoverGate({ ...valid, allowFlag: undefined }),
    ).toEqual({
      allowed: false,
      reason: `missing ${HOSTED_CUTOVER_FLAG}=1`,
    });
  });

  it("denies wrong project", () => {
    expect(
      checkHostedCatalogueCutoverGate({
        ...valid,
        actualProjectRef: "other",
      }),
    ).toEqual({ allowed: false, reason: "wrong_project_ref" });
  });

  it("denies wrong host", () => {
    expect(
      checkHostedCatalogueCutoverGate({
        ...valid,
        databaseUrl:
          "postgresql://postgres.other:x@aws-0-eu-west-1.pooler.supabase.com:5432/postgres",
      }),
    ).toEqual({ allowed: false, reason: "wrong_database_host" });
  });

  it("denies loopback as hosted", () => {
    expect(
      checkHostedCatalogueCutoverGate({
        ...valid,
        databaseUrl: "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
      }),
    ).toEqual({ allowed: false, reason: "hosted_database_url_required" });
  });

  it("denies wrong migration head", () => {
    expect(
      checkHostedCatalogueCutoverGate({
        ...valid,
        actualMigrationHead: "0015_silent_sentinel",
      }),
    ).toEqual({ allowed: false, reason: "wrong_migration_head" });
  });

  it("denies stale expected 0017 when actual is 0018", () => {
    expect(
      checkHostedCatalogueCutoverGate({
        ...valid,
        expectedMigrationHead: "0017_route_reference_immutability",
        actualMigrationHead: "0018_subject_visibility_and_route_assignment",
      }),
    ).toEqual({ allowed: false, reason: "wrong_migration_head" });
  });

  it("denies wrong repository commit", () => {
    expect(
      checkHostedCatalogueCutoverGate({
        ...valid,
        actualRepositoryCommit: "deadbeef",
      }),
    ).toEqual({ allowed: false, reason: "wrong_repository_commit" });
  });

  it("denies missing backup acknowledgement", () => {
    expect(
      checkHostedCatalogueCutoverGate({
        ...valid,
        backupAcknowledged: false,
      }),
    ).toEqual({ allowed: false, reason: "missing_backup_acknowledgement" });
  });

  it("denies fingerprint mismatch", () => {
    expect(
      checkHostedCatalogueCutoverGate({
        ...valid,
        actualFingerprint: "nope",
      }),
    ).toEqual({ allowed: false, reason: "pre_cutover_fingerprint_mismatch" });
  });

  it("allows correct mocked gate with explicit 0018 expectations", () => {
    expect(checkHostedCatalogueCutoverGate(valid)).toEqual({ allowed: true });
  });

  it("reads explicit env expectations without hardcoding a freeze SHA", () => {
    const input = hostedCutoverGateInputFromEnv({
      [HOSTED_CUTOVER_FLAG]: "1",
      LOCKDIN_EXPECTED_PROJECT_REF: KNOWN_HOSTED_PROJECT_REF,
      LOCKDIN_ACTUAL_PROJECT_REF: KNOWN_HOSTED_PROJECT_REF,
      DATABASE_URL: valid.databaseUrl,
      LOCKDIN_EXPECTED_REPOSITORY_COMMIT: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      LOCKDIN_ACTUAL_REPOSITORY_COMMIT: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      LOCKDIN_EXPECTED_MIGRATION_HEAD: "0018_subject_visibility_and_route_assignment",
      LOCKDIN_ACTUAL_MIGRATION_HEAD: "0018_subject_visibility_and_route_assignment",
      LOCKDIN_HOSTED_BACKUP_CONFIRMED: "1",
      LOCKDIN_EXPECTED_PRECUTOVER_FINGERPRINT: "fp",
      LOCKDIN_ACTUAL_PRECUTOVER_FINGERPRINT: "fp",
    } as NodeJS.ProcessEnv);
    expect(checkHostedCatalogueCutoverGate(input)).toEqual({ allowed: true });
  });

  it("keeps local publication path loopback-only", () => {
    expect(() =>
      assertDatabaseMutationTargetAllowed({
        databaseUrl: valid.databaseUrl,
        mode: "local",
        requireLocalPublicationFlag: true,
        localPublicationFlag: "1",
      }),
    ).toThrow(/loopback/);

    expect(() =>
      assertDatabaseMutationTargetAllowed({
        databaseUrl: "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
        mode: "local",
        requireLocalPublicationFlag: true,
        localPublicationFlag: "1",
      }),
    ).not.toThrow();
  });
});
