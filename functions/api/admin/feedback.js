// GET /api/admin/feedback
// 查询反馈列表，支持分页和过滤

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
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
  const offset = parseInt(url.searchParams.get('offset') || '0');
  const documentId = url.searchParams.get('documentId');

  if (!env.DB) {
    return json({
      ok: false,
      error: 'database_not_configured'
    }, { status: 503, headers: corsHeaders });
  }

  try {
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
    }, { headers: corsHeaders });
  } catch (error) {
    return json({
      ok: false,
      error: 'database_error',
      message: error.message
    }, { status: 500, headers: corsHeaders });
  }
}
