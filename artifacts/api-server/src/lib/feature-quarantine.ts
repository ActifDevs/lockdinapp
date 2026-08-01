/**
 * Temporary Slice 2 quarantine for features that still lack per-user ownership.
 * Ordinary users must not read or mutate global shared student-progress tables.
 */
export const FEATURE_TEMPORARILY_UNAVAILABLE =
  "This feature is temporarily unavailable until per-user ownership is implemented";

export function temporarilyUnavailableBody() {
  return { error: FEATURE_TEMPORARILY_UNAVAILABLE };
}
