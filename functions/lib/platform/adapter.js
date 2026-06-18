/**
 * Platform Adapter
 * Provides a unified request handler interface across different platforms
 */

import { createDatabase } from '../db/index.js'
import { validateSchema } from '../validation.js'
import { requireAuth } from '../auth.js'
import { apiError, optionsResponse } from '../http.js'

/**
 * Create a unified request handler that works across platforms
 * @param {Object} options - Handler configuration
 * @param {string|null} options.auth - Required auth level ('admin', 'user', or null)
 * @param {string} options.methods - Allowed HTTP methods
 * @param {Object|null} options.schema - Request body validation schema
 * @param {Function} options.handler - The actual business logic
 * @returns {Function} Platform-agnostic request handler
 */
export function createHandler(options = {}) {
  const {
    auth = null,
    methods = 'GET',
    schema = null,
    handler
  } = options

  if (!handler || typeof handler !== 'function') {
    throw new Error('Handler function is required')
  }

  return async (context) => {
    try {
      // 1. Normalize context (support multiple platforms)
      const normalized = normalizeContext(context)
      const { request, env, platform } = normalized

      // 2. Database check
      if (!env.DB && !env.DATABASE_URL && !env.DB_CLIENT) {
        return apiError(
          'database_not_configured',
          503,
          'Database not available',
          request,
          env,
          methods
        )
      }

      // 3. Authentication check
      if (auth) {
        const authResult = await requireAuth(request, env, auth)
        if (!authResult.authorized) {
          // 401 for authentication failure (no token or invalid token)
          // 403 for authorization failure (valid token but insufficient permissions)
          const statusCode = authResult.error === 'insufficient_permissions' ? 403 : 401
          return apiError(
            authResult.error || 'unauthorized',
            statusCode,
            'Unauthorized',
            request,
            env,
            methods
          )
        }
        normalized.auth = authResult
        normalized.user = authResult.user
      }

      // 4. Request body validation
      if (schema && (request.method === 'POST' || request.method === 'PATCH' || request.method === 'PUT')) {
        const body = await request.json().catch(() => null)
        const validation = validateSchema(body, schema)
        if (!validation.valid) {
          return apiError(
            'validation_error',
            400,
            validation.error,
            request,
            env,
            methods
          )
        }
        normalized.body = body
      }

      // 5. Create database instance
      normalized.db = createDatabase(env)

      // 6. Execute business logic
      return await handler(normalized)
    } catch (error) {
      console.error('Handler error:', error)

      // Try to get request and env from context for error response
      const { request, env } = normalizeContext(context)

      return apiError(
        'server_error',
        500,
        error.message || 'Internal server error',
        request,
        env,
        methods
      )
    }
  }
}

/**
 * Normalize request context from different platforms
 * @param {Object} context - Platform-specific context
 * @returns {Object} Normalized context
 */
function normalizeContext(context) {
  // Express (Node.js). Check this first because the Express adapter also
  // provides request/env for the Cloudflare-compatible handlers.
  if (context.req && context.res) {
    return {
      request: adaptExpressRequest(context.req),
      env: {
        ...process.env,
        DB_CLIENT: context.env?.DB_CLIENT || process.env.DB_CLIENT
      },
      platform: 'nodejs',
      res: context.res,
      req: context.req
    }
  }

  // Cloudflare Pages Functions
  if (context.request && context.env) {
    return {
      request: context.request,
      env: context.env,
      platform: 'cloudflare',
      next: context.next,
      waitUntil: context.waitUntil
    }
  }

  // Vercel Serverless Functions
  if (context.req && !context.env) {
    return {
      request: adaptVercelRequest(context.req),
      env: process.env,
      platform: 'vercel',
      res: context.res,
      req: context.req
    }
  }

  throw new Error('Unknown platform context')
}

/**
 * Adapt Express request to Web API Request-like object
 * @param {Object} req - Express request
 * @returns {Object} Request-like object
 */
function adaptExpressRequest(req) {
  const protocol = req.protocol || 'http'
  const host = req.get('host') || 'localhost'
  const url = `${protocol}://${host}${req.originalUrl || req.url}`

  return {
    method: req.method,
    url: url,
    headers: createHeadersFromObject(req.headers),
    json: async () => req.body,
    text: async () => typeof req.body === 'string' ? req.body : JSON.stringify(req.body),
    clone: () => adaptExpressRequest(req)
  }
}

/**
 * Adapt Vercel request to Web API Request-like object
 * @param {Object} req - Vercel request
 * @returns {Object} Request-like object
 */
function adaptVercelRequest(req) {
  // Vercel uses similar structure to Express
  return adaptExpressRequest(req)
}

/**
 * Create Headers object from plain object
 * @param {Object} headers - Plain object with headers
 * @returns {Headers} Web API Headers object
 */
function createHeadersFromObject(headers) {
  const headersObj = new Headers()
  for (const [key, value] of Object.entries(headers)) {
    if (Array.isArray(value)) {
      value.forEach(v => headersObj.append(key, v))
    } else {
      headersObj.set(key, value)
    }
  }
  return headersObj
}

/**
 * Create a simple OPTIONS handler
 * @param {string} methods - Allowed methods
 * @returns {Function} OPTIONS handler
 */
export function createOptionsHandler(methods) {
  return async (context) => {
    const { request, env } = normalizeContext(context)
    return optionsResponse(request, env, methods)
  }
}
