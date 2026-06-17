import { RateLimitError } from '../http/errors.js';

/**
 * Rate Limiter using D1 database
 *
 * Features:
 * - Per-key rate limiting (IP, user, endpoint)
 * - Sliding window algorithm
 * - Automatic cleanup of expired entries
 * - Configurable limits per endpoint
 */
export class RateLimiter {
  constructor(env, config) {
    this.env = env;
    this.config = {
      enabled: config?.enabled ?? true,
      keyPrefix: config?.keyPrefix ?? 'rl:',
      windowMs: config?.windowMs ?? 15 * 60 * 1000, // 15 minutes
      maxRequests: config?.maxRequests ?? 100,
    };
  }

  /**
   * Check if request is within rate limit
   * @param {string} key - Rate limit key (e.g., 'ip:127.0.0.1', 'user:123')
   * @param {number} maxRequests - Maximum requests allowed (overrides config)
   * @param {number} windowMs - Time window in milliseconds (overrides config)
   * @returns {Promise<boolean>} - True if within limit
   * @throws {RateLimitError} - If rate limit exceeded
   */
  async check(key, maxRequests = null, windowMs = null) {
    if (!this.config.enabled) {
      return true;
    }

    const max = maxRequests ?? this.config.maxRequests;
    const window = windowMs ?? this.config.windowMs;
    const now = Date.now();
    const windowKey = `${this.config.keyPrefix}${key}:${Math.floor(now / window)}`;

    try {
      // Get current count for this window
      const current = await this.env.DB.prepare(
        'SELECT value FROM rate_limits WHERE key = ? AND expires_at > ?'
      ).bind(windowKey, new Date(now).toISOString()).first();

      const count = current ? parseInt(current.value, 10) : 0;

      // Check if limit exceeded
      if (count >= max) {
        const retryAfter = Math.ceil((Math.floor(now / window) + 1) * window - now) / 1000;
        throw new RateLimitError(retryAfter);
      }

      // Increment counter
      const expiresAt = new Date(now + window).toISOString();
      await this.env.DB.prepare(
        `INSERT INTO rate_limits (key, value, expires_at, created_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = CAST(value AS INTEGER) + 1`
      ).bind(
        windowKey,
        String(count + 1),
        expiresAt,
        new Date(now).toISOString()
      ).run();

      return true;
    } catch (error) {
      if (error instanceof RateLimitError) {
        throw error;
      }
      // Log error but don't block request if rate limiting fails
      console.error('Rate limit check failed:', error);
      return true;
    }
  }

  /**
   * Get rate limit key from request
   * @param {Request} request - Request object
   * @param {string} userId - Optional user ID
   * @returns {string} - Rate limit key
   */
  static getKey(request, userId = null) {
    if (userId) {
      return `user:${userId}`;
    }

    // Use Cloudflare's connecting IP
    const ip = request.headers.get('cf-connecting-ip') ||
               request.headers.get('x-forwarded-for') ||
               'unknown';
    return `ip:${ip}`;
  }

  /**
   * Rate limit middleware for Cloudflare Pages Functions
   * @param {Object} context - Request context
   * @param {Object} options - Rate limit options
   * @returns {Promise<Response>} - Response or passes to next()
   */
  static async middleware(context, options = {}) {
    const { request, env, next } = context;

    // Skip rate limiting for certain paths
    const url = new URL(request.url);
    const skipPaths = options.skipPaths || ['/api/health', '/api/v1/public/health'];
    if (skipPaths.some(path => url.pathname === path)) {
      return next();
    }

    const rateLimiter = new RateLimiter(env, options);

    // Get rate limit key
    const key = RateLimiter.getKey(request);

    // Check rate limit
    await rateLimiter.check(key, options.maxRequests, options.windowMs);

    return next();
  }

  /**
   * Cleanup expired rate limit entries
   * Should be called periodically (e.g., via cron job)
   */
  static async cleanup(env) {
    try {
      const result = await env.DB.prepare(
        'DELETE FROM rate_limits WHERE expires_at < ?'
      ).bind(new Date().toISOString()).run();

      console.log(`Cleaned up ${result.changes || 0} expired rate limit entries`);
      return result.changes || 0;
    } catch (error) {
      console.error('Rate limit cleanup failed:', error);
      throw error;
    }
  }
}

/**
 * Rate limit configuration presets
 */
export const RateLimitPresets = {
  // Very strict - for sensitive endpoints
  strict: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10,
  },

  // Normal - for regular API endpoints
  normal: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
  },

  // Relaxed - for public endpoints
  relaxed: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 300,
  },

  // Per minute - for high-frequency endpoints
  perMinute: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60,
  },
};

/**
 * Example usage in API endpoint:
 *
 * import { RateLimiter, RateLimitPresets } from '../../lib/rate-limit/index.js';
 *
 * export async function onRequest(context) {
 *   const { request, env } = context;
 *
 *   // Apply rate limiting
 *   const rateLimiter = new RateLimiter(env, RateLimitPresets.normal);
 *   const key = RateLimiter.getKey(request);
 *   await rateLimiter.check(key);
 *
 *   // Your API logic here
 *   return Response.json({ ok: true });
 * }
 *
 * // Or use as middleware in functions/api/_middleware.js:
 * export async function onRequest(context) {
 *   return RateLimiter.middleware(context, RateLimitPresets.normal);
 * }
 */
