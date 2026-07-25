import { json, optionsResponse } from '../../lib/http.js'

const METHODS = 'GET, OPTIONS'

export async function onRequestGet({ request, env }) {
  try {
    if (!env.DB || typeof env.DB.prepare !== 'function') {
      throw new Error('Database binding is unavailable')
    }

    await env.DB.prepare('SELECT 1 AS ready').first()
    return json({
      ok: true,
      status: 'ready',
      service: 'byteforge-api',
      database: 'd1',
      timestamp: new Date().toISOString(),
    }, {}, request, env, METHODS)
  } catch {
    return json({
      ok: false,
      status: 'not_ready',
      service: 'byteforge-api',
      database: 'unavailable',
      timestamp: new Date().toISOString(),
    }, { status: 503 }, request, env, METHODS)
  }
}

export async function onRequestOptions({ request, env }) {
  return optionsResponse(request, env, METHODS)
}
