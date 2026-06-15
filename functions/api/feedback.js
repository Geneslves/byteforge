// User feedback endpoint
// POST /api/feedback

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
  // Parse request body
  const body = await request.json().catch(() => null);

  if (!body || typeof body.routePath !== 'string' || typeof body.message !== 'string') {
    return json({
      ok: false,
      error: 'invalid_payload',
      message: 'Missing required fields: routePath, message'
    }, { status: 400, headers: corsHeaders });
  }

  const message = body.message.trim();

  // Validate message length
  if (message.length < 2 || message.length > 1000) {
    return json({
      ok: false,
      error: 'invalid_message_length',
      message: 'Message must be between 2 and 1000 characters'
    }, { status: 400, headers: corsHeaders });
  }

  // Check if DB binding exists
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
      'INSERT INTO feedback (id, document_id, route_path, message, created_at, user_agent) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(
      id,
      body.documentId || null,
      body.routePath,
      message,
      createdAt,
      userAgent
    ).run();

    return json({
      ok: true,
      id,
      created_at: createdAt
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('Feedback error:', error);
    return json({
      ok: false,
      error: 'database_error',
      message: error.message
    }, { status: 500, headers: corsHeaders });
  }
}
