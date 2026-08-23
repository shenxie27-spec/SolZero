export function utcDateString(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function utcYesterdayString(date = new Date()) {
  const d = new Date(date.getTime() - 86400000);
  return utcDateString(d);
}

export function ladderPoints(streak) {
  return Math.min(Math.max(1, Math.floor(streak)), 7);
}

export function computeStreak(lastCheckinDate, today, currentStreak) {
  if (lastCheckinDate === today) return { streak: currentStreak, alreadyDone: true };
  const yesterday = utcYesterdayString(new Date(`${today}T00:00:00Z`));
  if (lastCheckinDate === yesterday) return { streak: currentStreak + 1, alreadyDone: false };
  return { streak: 1, alreadyDone: false };
}

export function cleanupPointsForUsd(usd) {
  if (!Number.isFinite(usd) || usd <= 0) return 0;
  return Math.floor(usd * 10);
}

export function referralPoints(amount, rate) {
  return Math.floor(amount * rate);
}