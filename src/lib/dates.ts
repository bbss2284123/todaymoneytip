export function seoulToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function formatKo(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${y}년 ${Number(m)}월 ${Number(d)}일`;
}

export function isPastDate(iso: string, today = seoulToday()): boolean {
  return iso < today;
}

export function daysUntil(iso: string, today = seoulToday()): number {
  const a = Date.parse(`${today}T00:00:00+09:00`);
  const b = Date.parse(`${iso}T00:00:00+09:00`);
  return Math.round((b - a) / 86_400_000);
}
