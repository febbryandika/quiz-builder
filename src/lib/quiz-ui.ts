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

// formatTimer: converts a whole-second count to m:ss.
// 0 → "0:00"; 5 → "0:05"; 65 → "1:05"; 600 → "10:00".
export function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
