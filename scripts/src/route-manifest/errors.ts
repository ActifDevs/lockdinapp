export class RouteManifestError extends Error {
  readonly code: string;
  readonly path?: string;

  constructor(code: string, message: string, path?: string) {
    super(path ? `${path}: ${message}` : message);
    this.name = "RouteManifestError";
    this.code = code;
    this.path = path;
  }
}

export type RouteManifestIssue = {
  code: string;
  path: string;
  message: string;
};

export class RouteManifestValidationError extends Error {
  readonly issues: RouteManifestIssue[];

  constructor(issues: RouteManifestIssue[]) {
    const summary =
      issues.length === 1
        ? `${issues[0]!.path}: ${issues[0]!.message}`
        : `${issues.length} validation error(s)`;
    super(summary);
    this.name = "RouteManifestValidationError";
    this.issues = issues;
  }
}
