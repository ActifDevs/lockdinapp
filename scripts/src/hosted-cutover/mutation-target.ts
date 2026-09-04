/**
 * Shared mutation-target gate for syllabus / applicability / component / route CLIs.
 * Local: loopback only (unchanged). Hosted: full cutover gate required.
 */
import {
  assertDatabaseMutationTargetAllowed,
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
  assertDatabaseMutationTargetAllowed({
    databaseUrl:
      args.databaseUrl ??
      process.env.DATABASE_URL ??
      process.env.DIRECT_DATABASE_URL,
    mode,
    hostedGate: args.hostedGate,
    localPublicationFlag: process.env.LOCKDIN_ALLOW_LOCAL_ROUTE_PUBLICATION,
    requireLocalPublicationFlag: args.requireLocalPublicationFlag === true,
  });
}
