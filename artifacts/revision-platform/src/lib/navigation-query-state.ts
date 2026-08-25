export type QueryParamResolution<T extends string> = {
  value: T;
  needsNormalization: boolean;
};

export type QueryParamUpdate = readonly [key: string, value: string | null];

export function resolveQueryParam<const T extends string>(
  params: URLSearchParams,
  key: string,
  allowedValues: readonly T[],
  defaultValue: T,
): QueryParamResolution<T> {
  const values = params.getAll(key);
  if (values.length === 0) {
    return { value: defaultValue, needsNormalization: false };
  }

  const value = values[0];
  if (values.length === 1 && allowedValues.includes(value as T)) {
    return { value: value as T, needsNormalization: false };
  }

  return { value: defaultValue, needsNormalization: true };
}

export function omitDefaultQueryValue<T extends string>(
  value: T,
  defaultValue: T,
): T | null {
  return value === defaultValue ? null : value;
}

export function updateQueryParams(
  current: URLSearchParams,
  updates: readonly QueryParamUpdate[],
): URLSearchParams {
  const next = new URLSearchParams(current);
  for (const [key, value] of updates) {
    next.delete(key);
    if (value !== null) next.set(key, value);
  }
  return next;
}

function localDate(year: number, month: number, day: number): Date {
  const value = new Date(2000, 0, 1, 12, 0, 0, 0);
  value.setFullYear(year, month - 1, day);
  return value;
}

export function parseLocalCalendarDate(value: string | null): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = localDate(year, month, day);
  return date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
    ? date
    : null;
}

export function parseLocalCalendarMonth(value: string | null): Date | null {
  const match = /^(\d{4})-(\d{2})$/.exec(value ?? "");
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const date = localDate(year, month, 1);
  return date.getFullYear() === year && date.getMonth() === month - 1
    ? date
    : null;
}

function paddedYear(value: Date): string {
  return String(value.getFullYear()).padStart(4, "0");
}

export function formatLocalCalendarDate(value: Date): string {
  return `${paddedYear(value)}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

export function formatLocalCalendarMonth(value: Date): string {
  return `${paddedYear(value)}-${String(value.getMonth() + 1).padStart(2, "0")}`;
}
