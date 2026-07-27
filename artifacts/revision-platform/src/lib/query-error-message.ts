export function getQueryErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Please check your connection and try again.";
  }

  const message = error.message.trim();
  if (message === "HTTP 500 Internal Server Error" || /^HTTP 5\d\d/.test(message)) {
    return "The API server is not running or returned an error. From the project root, run pnpm dev to start the frontend and API together.";
  }

  if (/fetch failed|Failed to fetch|NetworkError|ECONNREFUSED/i.test(message)) {
    return "Could not reach the API. Make sure the API server is running (pnpm dev from the project root).";
  }

  return message;
}
