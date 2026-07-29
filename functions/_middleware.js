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
    '/api/health/live',
    '/api/health/ready',
    '/api/v1/public/health',
  ];

  if (skipPaths.includes(url.pathname)) {
    return next();
  }

  if (
    url.pathname === '/api/auth/register' &&
    request.method === 'POST' &&
    env.REGISTRATION_ENABLED !== 'true'
  ) {
    return apiError(
      'registration_disabled',
      403,
      'Registration is currently disabled',
      request,
      env,
      'POST, OPTIONS'
    );
  }

  try {
    // Apply rate limiting
    const strictAuthPaths = new Set([
      '/api/auth/login',
      '/api/auth/register',
      '/api/v1/auth/refresh',
    ]);
    const preset = strictAuthPaths.has(url.pathname)
      ? RateLimitPresets.strict
      : RateLimitPresets.normal;
    const rateLimiter = new RateLimiter(env, preset);
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
