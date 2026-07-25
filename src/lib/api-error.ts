export function apiErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "body" in error) {
    const detail = (error as { body?: { detail?: unknown } }).body?.detail;
    if (typeof detail === "string" && detail.length > 0) return detail;
  }
  return fallback;
}
