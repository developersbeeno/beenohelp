// Error reporting
export function reportError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  console.error("[Beeno Help Center] Error:", error, context);
}
