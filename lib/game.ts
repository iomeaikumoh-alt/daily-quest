export function calcExp(difficulty: number, durationMin: number): number {
  const raw = (10 + difficulty * 8) * Math.sqrt(Math.max(durationMin, 1) / 30);
  return Math.max(10, Math.min(100, Math.round(raw / 5) * 5));
}

export function timeBand(startTime: string | null, completedAt = new Date()): 'morning' | 'afternoon' | 'evening' | 'night' {
  const hour = startTime ? Number(startTime.slice(0, 2)) : completedAt.getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 22) return 'evening';
  return 'night';
}