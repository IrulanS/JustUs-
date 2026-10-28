export const ANNIVERSARY_ISO = "2026-03-07";

const dayKey = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Europe/Paris" });

function dayIndex(key: string) {
  const parts = key.split("-").map(Number);
  const y = parts[0] ?? 0;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  return Date.UTC(y, m - 1, d) / 86_400_000;
}

export function daysTogether(now: number): number {
  return Math.max(0, Math.round(dayIndex(dayKey(new Date(now))) - dayIndex(ANNIVERSARY_ISO)));
}
