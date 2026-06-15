// DELETE /api/admin/feedback/:id
// 删除指定的反馈

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
  'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

export async function onRequestDelete({ request, env }) {
  if (!env.DB) {
    return json({
      ok: false,
      error: 'database_not_configured'
    }, { status: 503, headers: corsHeaders });
  }

  // 从 URL 中提取 ID
  const url = new URL(request.url);
  const id = url.pathname.split('/').pop();

  if (!id || id === 'delete') {
    return json({
      ok: false,
      error: 'missing_id',
      message: 'Feedback ID is required'
    }, { status: 400, headers: corsHeaders });
  }

  try {
    const result = await env.DB.prepare(
      'DELETE FROM feedback WHERE id = ?'
    ).bind(id).run();

    if (result.meta.changes === 0) {
      return json({
        ok: false,
        error: 'not_found',
        message: 'Feedback not found'
      }, { status: 404, headers: corsHeaders });
    }

    return json({
      ok: true,
      id,
      deleted: true,
    }, { headers: corsHeaders });
  } catch (error) {
    return json({
      ok: false,
      error: 'database_error',
      message: error.message
    }, { status: 500, headers: corsHeaders });
  }
}
