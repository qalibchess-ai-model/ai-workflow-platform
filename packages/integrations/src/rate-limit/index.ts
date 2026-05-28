import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import { IntegrationConfigError, RateLimitError } from "../errors";

type LimiterSpec = {
  tokens: number;
  windowSeconds: number;
  burst?: number;
};

const DEFAULT_SPEC: LimiterSpec = { tokens: 50, windowSeconds: 1, burst: 50 };

const PROVIDER_LIMITS: Record<string, LimiterSpec> = {
  gmail: { tokens: 250, windowSeconds: 1, burst: 250 },
  slack: { tokens: 50, windowSeconds: 1, burst: 50 },
  notion: { tokens: 3, windowSeconds: 1, burst: 3 },
  hubspot: { tokens: 100, windowSeconds: 10, burst: 100 },
  noop: { tokens: 1000, windowSeconds: 1, burst: 1000 },
};

let cachedRedis: Redis | undefined;
const limiters = new Map<string, Ratelimit>();

function getRedis(): Redis {
  if (cachedRedis) return cachedRedis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new IntegrationConfigError(
      "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required for rate limiting",
    );
  }
  cachedRedis = new Redis({ url, token });
  return cachedRedis;
}

function getLimiter(provider: string): Ratelimit {
  let limiter = limiters.get(provider);
  if (limiter) return limiter;

  const spec = PROVIDER_LIMITS[provider] ?? DEFAULT_SPEC;
  limiter = new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.tokenBucket(
      spec.tokens,
      `${spec.windowSeconds} s`,
      spec.burst ?? spec.tokens,
    ),
    prefix: `ratelimit:${provider}`,
    analytics: false,
  });
  limiters.set(provider, limiter);
  return limiter;
}

export async function withRateLimit<T>(
  provider: string,
  tenantId: string,
  fn: () => Promise<T>,
): Promise<T> {
  const limiter = getLimiter(provider);
  const { success, reset } = await limiter.limit(`${provider}:${tenantId}`);

  if (!success) {
    const waitMs = Math.max(0, reset - Date.now());
    throw new RateLimitError(provider, waitMs);
  }

  return fn();
}

export { RateLimitError };
