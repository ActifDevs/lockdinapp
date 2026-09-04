/**
 * Shared mutation-target gate for syllabus / applicability / component / route CLIs.
 * Local: loopback only (unchanged). Hosted: full cutover gate required.
 *
 * Hosted mode loads exact expected/actual gate values from the one-shot env
 * boundary when callers do not pass an explicit hostedGate object. Merely
 * pointing DATABASE_URL at Hosted never authorizes mutation.
 */
import {
  assertDatabaseMutationTargetAllowed,
  hostedCutoverGateInputFromEnv,
  type HostedCutoverGateInput,
} from "./safety-gate.js";

export type MutationTargetMode = "local" | "hosted-cutover";

export function resolveMutationTargetMode(
  args: string[] = [],
): MutationTargetMode {
  if (args.includes("--hosted-cutover")) return "hosted-cutover";
  return "local";
}

export function assertCatalogueMutationAuthorized(args: {
  argv?: string[];
  databaseUrl?: string;
  hostedGate?: HostedCutoverGateInput;
  /** When true, also require LOCKDIN_ALLOW_LOCAL_ROUTE_PUBLICATION for local mode. */
  requireLocalPublicationFlag?: boolean;
}): void {
  const mode = resolveMutationTargetMode(args.argv ?? []);
  const hostedGate =
    args.hostedGate ??
    (mode === "hosted-cutover" ? hostedCutoverGateInputFromEnv() : undefined);
  assertDatabaseMutationTargetAllowed({
    databaseUrl:
      args.databaseUrl ??
      process.env.DATABASE_URL ??
      process.env.DIRECT_DATABASE_URL,
    mode,
    hostedGate,
    localPublicationFlag: process.env.LOCKDIN_ALLOW_LOCAL_ROUTE_PUBLICATION,
    requireLocalPublicationFlag: args.requireLocalPublicationFlag === true,
  });
}
