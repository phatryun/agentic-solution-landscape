/**
 * Simple in-memory rate limiter using a sliding window.
 * In production, replace with Redis or DynamoDB for multi-instance support.
 * Sufficient for Amplify SSR (single instance per request context).
 */

interface Window {
  count: number;
  resetAt: number;
}

const store = new Map<string, Window>();

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function rateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const window = store.get(key);

  if (!window || now > window.resetAt) {
    // New window
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, remaining: config.maxRequests - 1, resetAt: now + config.windowMs };
  }

  if (window.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: window.resetAt };
  }

  window.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - window.count,
    resetAt: window.resetAt,
  };
}

// Periodically clean up expired entries (every 5 min)
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, window] of store) {
      if (now > window.resetAt) store.delete(key);
    }
  }, 5 * 60 * 1000);
}
