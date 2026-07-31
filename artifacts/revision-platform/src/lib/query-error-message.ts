export function getQueryErrorMessage(error: unknown): string {
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

  if (message === "HTTP 500 Internal Server Error" || /^HTTP 5\d\d\b/.test(message)) {
    return "The API returned a server error. Please retry while we investigate.";
  }

  if (/fetch failed|Failed to fetch|NetworkError|ECONNREFUSED/i.test(message)) {
    return "Could not reach the API. Make sure the API server is running (pnpm dev from the project root).";
  }

  return message;
}
