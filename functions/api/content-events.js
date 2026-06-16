import { apiError, json, optionsResponse, requireDatabase } from '../lib/http.js';

const METHODS = 'POST, OPTIONS';
const VALID_EVENT_TYPES = ['view', 'click', 'search', 'share'];

export async function onRequestOptions({ request, env }) {
  return optionsResponse(request, env, METHODS);
}

export async function onRequestPost({ request, env }) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body.routePath !== 'string' || typeof body.eventType !== 'string') {
    return apiError('invalid_payload', 400, 'Missing required fields: routePath, eventType', request, env, METHODS);
  }

  if (!VALID_EVENT_TYPES.includes(body.eventType)) {
    return apiError('invalid_event_type', 400, `Event type must be one of: ${VALID_EVENT_TYPES.join(', ')}`, request, env, METHODS);
  }

  if (!requireDatabase(env)) {
    return apiError('database_not_configured', 503, 'Database binding not configured', request, env, METHODS);
  }

  try {
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const userAgent = request.headers.get('user-agent') || '';

    await env.DB.prepare(
      'INSERT INTO content_events (id, document_id, route_path, event_type, created_at, user_agent) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(
      id,
      body.documentId || null,
      body.routePath,
      body.eventType,
      createdAt,
      userAgent
    ).run();

    return json({ ok: true, id, created_at: createdAt }, {}, request, env, METHODS);
  } catch {
    return apiError('database_error', 500, 'Unable to store content event', request, env, METHODS);
  }
}
