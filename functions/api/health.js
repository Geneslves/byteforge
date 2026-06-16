import { apiError, json } from '../lib/http.js';

export async function onRequestGet({ request, env }) {
  try {
    return json({
      ok: true,
      service: 'byteforge-api',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    }, {}, request, env, 'GET, OPTIONS');
  } catch {
    return apiError('server_error', 500, 'Health check failed', request, env, 'GET, OPTIONS');
  }
}
