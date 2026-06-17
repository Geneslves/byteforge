import { RateLimiter, RateLimitPresets } from './lib/rate-limit/index.js';
import { apiError } from './lib/http.js';

/**
 * Global API Middleware
 *
 * Applies to all /api/* requests
 * - Rate limiting
 * - CORS headers
 * - Error handling
 */

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);

  if (!url.pathname.startsWith('/api/')) {
    return next();
  }

  // Skip rate limiting for health checks
  const skipPaths = [
    '/api/health',
    '/api/v1/public/health',
  ];

  if (skipPaths.includes(url.pathname)) {
    return next();
  }

  try {
    // Apply rate limiting
    const rateLimiter = new RateLimiter(env, RateLimitPresets.normal);
    const key = RateLimiter.getKey(request);

    await rateLimiter.check(key);

    // Continue to the actual API handler
    return await next();

  } catch (error) {
    // Handle rate limit errors
    if (error.code === 'RATE_LIMIT_EXCEEDED') {
      return apiError(
        error.code,
        429,
        error.message,
        request,
        env,
        'GET, POST, PUT, PATCH, DELETE, OPTIONS'
      );
    }

    // Re-throw other errors to be handled by endpoint-specific handlers
    throw error;
  }
}
