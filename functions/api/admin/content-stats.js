// GET /api/admin/content-stats
// 获取每个内容的详细统计

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
  if (!env.DB) {
    return json({
      ok: false,
      error: 'database_not_configured'
    }, { status: 503, headers: corsHeaders });
  }

  const url = new URL(request.url);
  const documentId = url.searchParams.get('documentId');

  try {
    if (documentId) {
      // 获取单个文档的详细统计
      const stats = await env.DB.prepare(`
        SELECT
          event_type,
          COUNT(*) as count,
          DATE(created_at) as date
        FROM content_events
        WHERE document_id = ?
        GROUP BY event_type, DATE(created_at)
        ORDER BY date DESC
      `).bind(documentId).all();

      const feedbackCount = await env.DB.prepare(`
        SELECT COUNT(*) as count
        FROM feedback
        WHERE document_id = ?
      `).bind(documentId).first();

      return json({
        ok: true,
        documentId,
        events: stats.results || [],
        feedbackCount: feedbackCount?.count || 0,
      }, { headers: corsHeaders });
    }

    // 获取所有文档的统计概览
    const allStats = await env.DB.prepare(`
      SELECT
        document_id,
        COUNT(CASE WHEN event_type = 'view' THEN 1 END) as views,
        COUNT(CASE WHEN event_type = 'click' THEN 1 END) as clicks,
        COUNT(CASE WHEN event_type = 'search' THEN 1 END) as searches,
        COUNT(CASE WHEN event_type = 'share' THEN 1 END) as shares,
        MAX(created_at) as last_activity
      FROM content_events
      WHERE document_id IS NOT NULL
      GROUP BY document_id
      ORDER BY views DESC
    `).all();

    // 获取每个文档的反馈数量
    const feedbackCounts = await env.DB.prepare(`
      SELECT document_id, COUNT(*) as count
      FROM feedback
      WHERE document_id IS NOT NULL
      GROUP BY document_id
    `).all();

    const feedbackMap = {};
    (feedbackCounts.results || []).forEach(item => {
      feedbackMap[item.document_id] = item.count;
    });

    const enriched = (allStats.results || []).map(stat => ({
      ...stat,
      feedback_count: feedbackMap[stat.document_id] || 0,
    }));

    return json({
      ok: true,
      stats: enriched,
    }, { headers: corsHeaders });
  } catch (error) {
    return json({
      ok: false,
      error: 'database_error',
      message: error.message
    }, { status: 500, headers: corsHeaders });
  }
}
