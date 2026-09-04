import { afterEach, describe, expect, it } from "vitest";
import { assertLocalRoutePublicationAllowed } from "../publish-safety.js";
import { RouteManifestError } from "../errors.js";

describe("route-manifest publish safety gate", () => {
  const originalFlag = process.env.LOCKDIN_ALLOW_LOCAL_ROUTE_PUBLICATION;
  const originalDb = process.env.DATABASE_URL;
  const originalDirect = process.env.DIRECT_DATABASE_URL;

  afterEach(() => {
    if (originalFlag === undefined) {
      delete process.env.LOCKDIN_ALLOW_LOCAL_ROUTE_PUBLICATION;
    } else {
      process.env.LOCKDIN_ALLOW_LOCAL_ROUTE_PUBLICATION = originalFlag;
    }
    if (originalDb === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDb;
    if (originalDirect === undefined) delete process.env.DIRECT_DATABASE_URL;
    else process.env.DIRECT_DATABASE_URL = originalDirect;
  });

  it("refuses without LOCKDIN_ALLOW_LOCAL_ROUTE_PUBLICATION=1", () => {
    delete process.env.LOCKDIN_ALLOW_LOCAL_ROUTE_PUBLICATION;
    process.env.DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
    expect(() => assertLocalRoutePublicationAllowed([])).toThrow(RouteManifestError);
  });

  it("refuses --hosted / --production / --remote", () => {
    process.env.LOCKDIN_ALLOW_LOCAL_ROUTE_PUBLICATION = "1";
    process.env.DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
    expect(() => assertLocalRoutePublicationAllowed(["--hosted"])).toThrow(
      /hosted_publication_forbidden|not supported/,
    );
  });

  it("refuses non-loopback DATABASE_URL", () => {
    process.env.LOCKDIN_ALLOW_LOCAL_ROUTE_PUBLICATION = "1";
    process.env.DATABASE_URL =
      "postgresql://postgres:postgres@db.example.com:5432/postgres";
    delete process.env.DIRECT_DATABASE_URL;
    expect(() => assertLocalRoutePublicationAllowed([])).toThrow(
      /loopback DATABASE_URL/,
    );
  });

  it("allows authorized local loopback publication", () => {
    process.env.LOCKDIN_ALLOW_LOCAL_ROUTE_PUBLICATION = "1";
    process.env.DATABASE_URL =
      "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
    expect(() => assertLocalRoutePublicationAllowed([])).not.toThrow();
  });
});
