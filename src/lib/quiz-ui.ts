// coerceTimeLimit: converts raw form string to number | null.
// Trim first; blank/whitespace → null.
// Otherwise pass the Number() result through — Zod rejects 0, decimals, NaN.
export function coerceTimeLimit(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  return Number(trimmed);
}

// formatPercent: converts a 0–1 fraction to a percentage string.
// null (no attempts) → "—"; 0 → "0%"; 0.756 → "76%"; 1 → "100%".
export function formatPercent(fraction: number | null): string {
  if (fraction === null) return "—";
  return `${Math.round(fraction * 100)}%`;
}
