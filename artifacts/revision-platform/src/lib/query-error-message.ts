type StatusError = Error & { status?: unknown };

export function getQueryErrorStatus(error: unknown): number | null {
  if (
    error instanceof Error &&
    typeof (error as StatusError).status === "number"
  ) {
    return (error as StatusError).status as number;
  }

  if (error instanceof Error) {
    const match = error.message.trim().match(/^HTTP\s+(\d{3})\b/i);
    return match ? Number(match[1]) : null;
  }

  return null;
}

export function isCancelledQueryError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "AbortError") return true;
  if (!(error instanceof Error)) return false;

  return (
    error.name === "AbortError" ||
    error.name === "CancelledError" ||
    /\b(?:aborted|cancelled|canceled)\b/i.test(error.message)
  );
}

export function getQueryErrorMessage(error: unknown): string {
  const status = getQueryErrorStatus(error);

  if (status === 400) {
    return "The request was not accepted. Please retry or return to the previous page.";
  }
  if (status === 403) {
    return "You don't have permission to view this information.";
  }
  if (status === 404) {
    return "The requested information could not be found.";
  }
  if (status === 409) {
    return "This information changed while it was loading. Please retry.";
  }
  if (status === 429) {
    return "Too many requests were made. Please wait a moment and try again.";
  }
  if (status !== null && status >= 500) {
    return "The API returned a server error. Please retry while we investigate.";
  }

  if (!(error instanceof Error)) {
    return "Please check your connection and try again.";
  }

  const message = error.message.trim();

  // Prefer structured API payloads when present:
  // "HTTP 500 Internal Server Error: Internal server error"
  const httpDetail = message.match(/^HTTP\s+(\d{3})\b[^:]*:\s*(.+)$/i);
  if (httpDetail) {
    const status = Number(httpDetail[1]);
    if (status >= 500) {
      return "The API returned a server error. Please retry while we investigate.";
    }
  }

  if (
    message === "HTTP 500 Internal Server Error" ||
    /^HTTP 5\d\d\b/.test(message)
  ) {
    return "The API returned a server error. Please retry while we investigate.";
  }

  if (/fetch failed|Failed to fetch|NetworkError|ECONNREFUSED/i.test(message)) {
    return "We couldn't reach Lockdin. Check your connection and try again.";
  }

  return "We couldn't load this information. Please try again.";
}
