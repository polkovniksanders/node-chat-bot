const COOLDOWN_MS = 60 * 60 * 1000; // 1 час

const lastGenerated = new Map<number, number>();

export function checkRateLimit(userId: number): { allowed: boolean; remainingMs: number } {
  const last = lastGenerated.get(userId);
  if (last === undefined) return { allowed: true, remainingMs: 0 };

  const elapsed = Date.now() - last;
  if (elapsed >= COOLDOWN_MS) return { allowed: true, remainingMs: 0 };

  return { allowed: false, remainingMs: COOLDOWN_MS - elapsed };
}

export function recordGeneration(userId: number): void {
  lastGenerated.set(userId, Date.now());
}

export function formatRemaining(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) return `${seconds} сек.`;
  if (seconds === 0) return `${minutes} мин.`;
  return `${minutes} мин. ${seconds} сек.`;
}
