export {};

declare global {
  namespace Express {
    interface Request {
      /** Verified Auth user id (`claims.sub`). Set only by requireAuth. */
      userId?: string;
      /** Raw Bearer access token for request-scoped Data API clients. */
      accessToken?: string;
    }
  }
}
