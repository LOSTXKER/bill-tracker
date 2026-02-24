// Simple in-memory rate limiter for API routes
// For production, consider using Redis or Upstash

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();
const MAX_RATE_LIMIT_ENTRIES = 10_000;

interface RateLimitOptions {
  windowMs?: number; // Time window in milliseconds
  maxRequests?: number; // Max requests per window
}

const DEFAULT_OPTIONS: Required<RateLimitOptions> = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60, // 60 requests per minute
};

/**
 * Check if a request should be rate limited
 * @param identifier - Unique identifier (e.g., IP address, user ID)
 * @param options - Rate limit options
 * @returns Whether the request is allowed and remaining requests
 */
export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = {}
): { allowed: boolean; remaining: number; resetIn: number } {
  const { windowMs, maxRequests } = { ...DEFAULT_OPTIONS, ...options };
  const now = Date.now();
  const key = identifier;

  // Evict expired/oldest entries if map is too large
  if (rateLimitStore.size >= MAX_RATE_LIMIT_ENTRIES) {
    for (const [k, v] of rateLimitStore.entries()) {
      if (now > v.resetTime) rateLimitStore.delete(k);
    }
    if (rateLimitStore.size >= MAX_RATE_LIMIT_ENTRIES) {
      const sorted = [...rateLimitStore.entries()].sort((a, b) => a[1].resetTime - b[1].resetTime);
      sorted.slice(0, Math.floor(MAX_RATE_LIMIT_ENTRIES / 2)).forEach(([k]) => rateLimitStore.delete(k));
    }
  }

  // Get or create entry
  let entry = rateLimitStore.get(key);

  // Reset if window has expired
  if (!entry || now > entry.resetTime) {
    entry = {
      count: 0,
      resetTime: now + windowMs,
    };
  }

  // Increment count
  entry.count++;
  rateLimitStore.set(key, entry);

  const allowed = entry.count <= maxRequests;
  const remaining = Math.max(0, maxRequests - entry.count);
  const resetIn = Math.max(0, entry.resetTime - now);

  return { allowed, remaining, resetIn };
}

/**
 * Rate limit middleware for API routes
 */
export function rateLimit(
  identifier: string,
  options?: RateLimitOptions
): { success: boolean; headers: Record<string, string> } {
  const { allowed, remaining, resetIn } = checkRateLimit(identifier, options);

  const headers: Record<string, string> = {
    "X-RateLimit-Remaining": remaining.toString(),
    "X-RateLimit-Reset": Math.ceil(resetIn / 1000).toString(),
  };

  if (!allowed) {
    headers["Retry-After"] = Math.ceil(resetIn / 1000).toString();
  }

  return { success: allowed, headers };
}

/**
 * Get IP address from request
 */
export function getClientIP(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  
  const realIP = request.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }

  return "unknown";
}

// Cleanup old entries periodically (every 5 minutes)
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (now > entry.resetTime) {
        rateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}
