// GET /api/admin/analytics
// 聚合分析数据

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

export async function onRequestGet({ env }) {
  if (!env.DB) {
    return json({
      ok: false,
      error: 'database_not_configured'
    }, { status: 503, headers: corsHeaders });
  }

  try {
    // 总统计
    const stats = await env.DB.prepare(`
      SELECT
        (SELECT COUNT(*) FROM feedback) as total_feedback,
        (SELECT COUNT(*) FROM content_events WHERE event_type = 'view') as total_views,
        (SELECT COUNT(*) FROM content_events WHERE event_type = 'click') as total_clicks,
        (SELECT COUNT(*) FROM content_events WHERE event_type = 'search') as total_searches
    `).first();

    // 热门文档（按浏览量）
    const topDocuments = await env.DB.prepare(`
      SELECT document_id, COUNT(*) as views
      FROM content_events
      WHERE event_type = 'view' AND document_id IS NOT NULL
      GROUP BY document_id
      ORDER BY views DESC
      LIMIT 10
    `).all();

    // 最近 7 天活动
    const recentActivity = await env.DB.prepare(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as events
      FROM content_events
      WHERE created_at >= datetime('now', '-7 days')
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `).all();

    return json({
      ok: true,
      stats: stats || {
        total_feedback: 0,
        total_views: 0,
        total_clicks: 0,
        total_searches: 0,
      },
      topDocuments: topDocuments.results || [],
      recentActivity: recentActivity.results || [],
    }, { headers: corsHeaders });
  } catch (error) {
    return json({
      ok: false,
      error: 'database_error',
      message: error.message
    }, { status: 500, headers: corsHeaders });
  }
}
