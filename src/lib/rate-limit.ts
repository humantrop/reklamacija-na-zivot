// Simple in-memory rate limiter keyed by IP
const attempts: Map<string, number[]> = new Map();

// Clean up old entries every 5 minutes
setInterval(() => {
  const cutoff = Date.now() - 3600_000;
  for (const [key, times] of attempts) {
    const filtered = times.filter((t) => t > cutoff);
    if (filtered.length === 0) attempts.delete(key);
    else attempts.set(key, filtered);
  }
}, 300_000);

/**
 * Returns true if the IP has exceeded the limit within the window.
 */
export function isRateLimited(
  ip: string,
  { maxAttempts = 10, windowMs = 3600_000 }: { maxAttempts?: number; windowMs?: number } = {}
): boolean {
  const now = Date.now();
  const times = attempts.get(ip) || [];
  const recent = times.filter((t) => t > now - windowMs);
  recent.push(now);
  attempts.set(ip, recent);
  return recent.length > maxAttempts;
}
