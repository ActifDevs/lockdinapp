// Keep these in Orval's canonical form so codegen recognizes the barrel
// exports and does not append duplicates on subsequent runs.
export * from './generated/api';
export * from './generated/api.schemas';
export {
  setBaseUrl,
  setAuthTokenGetter,
  setUnauthorizedHandler,
  customFetch,
  ApiError,
} from "./custom-fetch";
export type { AuthTokenGetter, UnauthorizedHandler } from "./custom-fetch";
