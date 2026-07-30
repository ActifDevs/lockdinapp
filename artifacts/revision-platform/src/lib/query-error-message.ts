export function getQueryErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Please check your connection and try again.";
  }

  const message = error.message.trim();
  if (message === "HTTP 500 Internal Server Error" || /^HTTP 5\d\d/.test(message)) {
    return "The dashboard API returned a server error. Please retry while we investigate.";
  }

  if (/fetch failed|Failed to fetch|NetworkError|ECONNREFUSED/i.test(message)) {
    return "Could not reach the API. Make sure the API server is running (pnpm dev from the project root).";
  }

  return message;
}
