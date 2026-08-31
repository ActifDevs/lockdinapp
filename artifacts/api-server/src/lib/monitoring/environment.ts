export const MONITORING_ENVIRONMENTS = [
  "development",
  "preview",
  "production",
] as const;

export type MonitoringEnvironment = (typeof MONITORING_ENVIRONMENTS)[number];

const ENVIRONMENT_SET = new Set<string>(MONITORING_ENVIRONMENTS);

export function resolveMonitoringEnvironment(input: {
  explicit?: string;
  vercelEnv?: string;
  nodeEnv?: string;
}): MonitoringEnvironment {
  const candidates = [input.explicit, input.vercelEnv, input.nodeEnv];
  for (const value of candidates) {
    const normalized = value?.trim().toLowerCase();
    if (normalized && ENVIRONMENT_SET.has(normalized)) {
      return normalized as MonitoringEnvironment;
    }
  }
  return "development";
}

export function resolveMonitoringRelease(input: {
  explicit?: string;
  vercelSha?: string;
}): string | undefined {
  const value = input.explicit?.trim() || input.vercelSha?.trim();
  return value || undefined;
}
