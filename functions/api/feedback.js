import { apiError, json, optionsResponse, requireDatabase } from '../lib/http.js';

const METHODS = 'POST, OPTIONS';

export async function onRequestOptions({ request, env }) {
  return optionsResponse(request, env, METHODS);
}

export async function onRequestPost({ request, env }) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body.routePath !== 'string' || typeof body.message !== 'string') {
    return apiError('invalid_payload', 400, 'Missing required fields: routePath, message', request, env, METHODS);
  }

  const message = body.message.trim();
  if (message.length < 2 || message.length > 1000) {
    return apiError('invalid_message_length', 400, 'Message must be between 2 and 1000 characters', request, env, METHODS);
  }

  if (!requireDatabase(env)) {
    return apiError('database_not_configured', 503, 'Database binding not configured', request, env, METHODS);
  }

  try {
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const userAgent = request.headers.get('user-agent') || '';

    await env.DB.prepare(
      'INSERT INTO feedback (id, document_id, route_path, message, created_at, user_agent) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(
      id,
      body.documentId || null,
      body.routePath,
      message,
      createdAt,
      userAgent
    ).run();

    return json({ ok: true, id, created_at: createdAt }, {}, request, env, METHODS);
  } catch {
    return apiError('database_error', 500, 'Unable to store feedback', request, env, METHODS);
  }
}
