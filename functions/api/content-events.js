// Content events endpoint
// POST /api/content-events

const json = (body, init = {}) => Response.json(body, {
  headers: {
    'cache-control': 'no-store',
    'content-type': 'application/json',
    ...init.headers
  },
  ...init,
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

export async function onRequestPost({ request, env }) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body.routePath !== 'string' || typeof body.eventType !== 'string') {
    return json({
      ok: false,
      error: 'invalid_payload',
      message: 'Missing required fields: routePath, eventType'
    }, { status: 400, headers: corsHeaders });
  }

  // Validate event type
  const validEventTypes = ['view', 'click', 'search', 'share'];
  if (!validEventTypes.includes(body.eventType)) {
    return json({
      ok: false,
      error: 'invalid_event_type',
      message: `Event type must be one of: ${validEventTypes.join(', ')}`
    }, { status: 400, headers: corsHeaders });
  }

  if (!env.DB) {
    return json({
      ok: false,
      error: 'database_not_configured',
      message: 'Database binding not configured'
    }, { status: 503, headers: corsHeaders });
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

    return json({
      ok: true,
      id,
      created_at: createdAt
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('Content event error:', error);
    return json({
      ok: false,
      error: 'database_error',
      message: error.message
    }, { status: 500, headers: corsHeaders });
  }
}
