import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { optionalAuth } from "./optional-auth";
import { requireAuth } from "./require-auth";

type ApiAuthMode = "public" | "optional";

type ApiAuthException = {
  method: "GET" | "POST" | "DELETE";
  path: string;
  mode: ApiAuthMode;
};

/**
 * Reviewed Phase 4 Gate 0 exceptions. Every method/path not listed here is
 * authenticated by the final policy handler below.
 *
 * POST /subjects and DELETE /subjects/:subjectId are deliberately public at
 * the auth layer so their read-only catalogue handlers can return 403.
 */
const API_AUTH_EXCEPTIONS: readonly ApiAuthException[] = [
  { method: "GET", path: "/healthz", mode: "public" },
  { method: "GET", path: "/healthz/db", mode: "public" },
  { method: "GET", path: "/subjects", mode: "public" },
  { method: "GET", path: "/subjects/:subjectId", mode: "public" },
  {
    method: "GET",
    path: "/subjects/:subjectId/assessment-components",
    mode: "optional",
  },
  {
    method: "GET",
    path: "/subjects/:subjectId/syllabus",
    mode: "optional",
  },
  { method: "POST", path: "/subjects", mode: "public" },
  { method: "DELETE", path: "/subjects/:subjectId", mode: "public" },
] as const;

const requestModes = new WeakMap<Request, ApiAuthMode>();
const policyRouter = Router();

function classifyException(exception: ApiAuthException) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    // Express treats HEAD as matching GET routes. Gate 0 exceptions are exact
    // HTTP methods, so check req.method explicitly instead of inheriting that.
    if (req.method === exception.method) {
      requestModes.set(req, exception.mode);
    }
    next();
  };
}

for (const exception of API_AUTH_EXCEPTIONS) {
  // Express performs exact, parameter-aware matching here. A public
  // /subjects/:subjectId route cannot match a nested /performance route.
  policyRouter.all(exception.path, classifyException(exception));
}

policyRouter.use((req, res, next) => {
  // CORS middleware normally completes preflight before this router. Keep an
  // explicit bypass so OPTIONS remains safe if middleware behavior changes.
  if (req.method === "OPTIONS") {
    next();
    return;
  }

  const mode = requestModes.get(req);
  if (mode === "public") {
    next();
    return;
  }
  if (mode === "optional") {
    void optionalAuth(req, res, next);
    return;
  }

  void requireAuth(req, res, next);
});

export default policyRouter;
