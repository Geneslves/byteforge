import { requireAuth } from '../../lib/auth.js';
import { apiError, json, optionsResponse, requireDatabase } from '../../lib/http.js';

const METHODS = 'GET, OPTIONS';

export async function onRequestOptions({ request, env }) {
  return optionsResponse(request, env, METHODS);
}

export async function onRequestGet({ request, env }) {
  if (!requireDatabase(env)) {
    return apiError('database_not_configured', 503, 'Database binding not configured', request, env, METHODS);
  }

  try {
    const auth = await requireAuth(request, env, 'admin');
    if (!auth.authorized) {
      return apiError(auth.error, 403, 'Admin access required', request, env, METHODS);
    }

    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 100);
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10), 0);
    const documentId = url.searchParams.get('documentId');
    let query = 'SELECT * FROM feedback';
    const params = [];

    if (documentId) {
      query += ' WHERE document_id = ?';
      params.push(documentId);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const { results } = await env.DB.prepare(query).bind(...params).all();

    return json({
      ok: true,
      data: results || [],
      pagination: { limit, offset, count: results ? results.length : 0 },
    }, {}, request, env, METHODS);
  } catch {
    return apiError('database_error', 500, 'Unable to load feedback', request, env, METHODS);
  }
}
