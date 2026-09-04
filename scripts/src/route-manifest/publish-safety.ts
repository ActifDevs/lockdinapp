import { isLoopbackUrl } from "../db-harness/target-safety.js";
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
 */
export function assertLocalRoutePublicationAllowed(args: string[] = []): void {
  for (const arg of args) {
    const flag = arg.split("=")[0]!;
    if (FORBIDDEN_FLAGS.has(flag)) {
      throw new RouteManifestError(
        "hosted_publication_forbidden",
        `flag ${flag} is not supported; route publication is local-only`,
      );
    }
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

export { LOCAL_PUBLICATION_FLAG };
