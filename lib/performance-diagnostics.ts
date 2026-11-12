const performanceDiagnosticsEnabled = process.env.AXION_PERFORMANCE_DIAGNOSTICS === "true";

export function startPerformanceTimer(): number {
  return performance.now();
}

export function logPerformanceDuration(operation: string, startedAt: number): void {
  if (!performanceDiagnosticsEnabled) return;
  console.info("[AXION_PERF]", JSON.stringify({
    operation,
    durationMs: Number((performance.now() - startedAt).toFixed(2)),
  }));
}

export async function measurePerformance<T>(operation: string, task: Promise<T>): Promise<T> {
  const startedAt = startPerformanceTimer();
  try {
    return await task;
  } finally {
    logPerformanceDuration(operation, startedAt);
  }
}
