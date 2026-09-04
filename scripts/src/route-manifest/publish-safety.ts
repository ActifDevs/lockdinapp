import { isLoopbackUrl } from "../db-harness/target-safety.js";
import { assertCatalogueMutationAuthorized } from "../hosted-cutover/mutation-target.js";
import { RouteManifestError } from "./errors.js";

const LOCAL_PUBLICATION_FLAG = "LOCKDIN_ALLOW_LOCAL_ROUTE_PUBLICATION";

const FORBIDDEN_FLAGS = new Set([
  "--hosted",
  "--production",
  "--remote",
  "--prod",
]);

/**
 * Trusted LOCAL publication gate.
 * Refuses hosted/remote flags and non-loopback DATABASE_URL.
 * Hosted publication must use --hosted-cutover + full cutover gate (separate path).
 */
export function assertLocalRoutePublicationAllowed(args: string[] = []): void {
  for (const arg of args) {
    const flag = arg.split("=")[0]!;
    if (FORBIDDEN_FLAGS.has(flag)) {
      throw new RouteManifestError(
        "hosted_publication_forbidden",
        `flag ${flag} is not supported; use --hosted-cutover with cutover authorization`,
      );
    }
  }

  if (args.includes("--hosted-cutover")) {
    throw new RouteManifestError(
      "hosted_publication_forbidden",
      "local publication path refused --hosted-cutover; use assertHostedRoutePublicationAllowed",
    );
  }

  if (process.env[LOCAL_PUBLICATION_FLAG] !== "1") {
    throw new RouteManifestError(
      "local_publication_unauthorized",
      `set ${LOCAL_PUBLICATION_FLAG}=1 to authorize local route-manifest publication`,
    );
  }

  const databaseUrl = process.env.DATABASE_URL ?? process.env.DIRECT_DATABASE_URL;
  if (!databaseUrl || !isLoopbackUrl(databaseUrl)) {
    throw new RouteManifestError(
      "non_local_database",
      "route publication requires a loopback DATABASE_URL / DIRECT_DATABASE_URL",
    );
  }
}

/**
 * Hosted route publication path — only after full catalogue cutover gate passes.
 * Does not weaken LOCKDIN_ALLOW_LOCAL_ROUTE_PUBLICATION local loopback rules.
 */
export function assertHostedRoutePublicationAllowed(input: {
  argv?: string[];
  hostedGate?: Parameters<
    typeof assertCatalogueMutationAuthorized
  >[0]["hostedGate"];
} = {}): void {
  const argv = input.argv ?? process.argv.slice(2);
  if (!argv.includes("--hosted-cutover")) {
    throw new RouteManifestError(
      "hosted_publication_forbidden",
      "hosted route publication requires --hosted-cutover",
    );
  }
  try {
    // hostedGate optional: assertCatalogueMutationAuthorized loads env when absent.
    assertCatalogueMutationAuthorized({
      argv,
      hostedGate: input.hostedGate,
      requireLocalPublicationFlag: false,
    });
  } catch (error) {
    throw new RouteManifestError(
      "hosted_publication_unauthorized",
      error instanceof Error ? error.message : "hosted cutover denied",
    );
  }
}

export { LOCAL_PUBLICATION_FLAG };
