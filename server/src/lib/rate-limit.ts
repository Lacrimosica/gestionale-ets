import type { Context, MiddlewareHandler } from 'hono';

/**
 * Cloudflare Workers rate-limit binding (`[[ratelimits]]` in wrangler.toml).
 * Counters are per Cloudflare location and eventually consistent, so this slows
 * brute force down sharply but is not an exact quota.
 */
export type RateLimiter = { limit(options: { key: string }): Promise<{ success: boolean }> };

type Env = { AUTH_RATE_LIMITER?: RateLimiter };

/** Client IP as seen by Cloudflare. X-Forwarded-For is client-controlled, so it is not used. */
export function clientIp(c: Context): string {
  return c.req.header('cf-connecting-ip') ?? 'unknown';
}

let warnedMissingBinding = false;

/**
 * True when any of `keys` is over its limit. Without the binding (local dev,
 * tests) every request is allowed; a limiter error also allows the request,
 * because locking every user out is worse than briefly losing throttling.
 */
export async function isRateLimited(limiter: RateLimiter | undefined, keys: string[]): Promise<boolean> {
  if (!limiter) {
    if (!warnedMissingBinding) {
      console.warn('AUTH_RATE_LIMITER binding missing: auth endpoints are not rate limited');
      warnedMissingBinding = true;
    }
    return false;
  }
  try {
    const results = await Promise.all(keys.map((key) => limiter.limit({ key })));
    return results.some((r) => !r.success);
  } catch (err) {
    console.error('Rate limiter failed; allowing request:', err);
    return false;
  }
}

export function tooManyRequests(c: Context): Response {
  c.header('Retry-After', '60');
  return c.json({ error: 'Too many attempts. Please wait a minute and try again.' }, 429);
}

/**
 * Throttle a route by client IP, under `scope` so different endpoints don't share a
 * budget. Use {@link isRateLimited} directly when the key needs the request body.
 */
export function rateLimitByIp(scope: string): MiddlewareHandler<{ Bindings: Env }> {
  return async (c, next) => {
    if (await isRateLimited(c.env.AUTH_RATE_LIMITER, [`${scope}:ip:${clientIp(c)}`])) {
      return tooManyRequests(c);
    }
    return next();
  };
}
