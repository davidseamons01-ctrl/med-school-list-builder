type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function checkRateLimit(input: {
  key: string;
  windowMs: number;
  maxRequests: number;
}): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const existing = buckets.get(input.key);

  if (!existing || existing.resetAt <= now) {
    const next: Bucket = { count: 1, resetAt: now + input.windowMs };
    buckets.set(input.key, next);
    return {
      allowed: true,
      remaining: Math.max(0, input.maxRequests - 1),
      resetAt: next.resetAt,
    };
  }

  if (existing.count >= input.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.resetAt,
    };
  }

  existing.count += 1;
  buckets.set(input.key, existing);
  return {
    allowed: true,
    remaining: Math.max(0, input.maxRequests - existing.count),
    resetAt: existing.resetAt,
  };
}

