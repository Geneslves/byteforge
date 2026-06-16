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

    const stats = await env.DB.prepare(`
      SELECT
        (SELECT COUNT(*) FROM feedback) as total_feedback,
        (SELECT COUNT(*) FROM content_events WHERE event_type = 'view') as total_views,
        (SELECT COUNT(*) FROM content_events WHERE event_type = 'click') as total_clicks,
        (SELECT COUNT(*) FROM content_events WHERE event_type = 'search') as total_searches
    `).first();

    const topDocuments = await env.DB.prepare(`
      SELECT document_id, COUNT(*) as views
      FROM content_events
      WHERE event_type = 'view' AND document_id IS NOT NULL
      GROUP BY document_id
      ORDER BY views DESC
      LIMIT 10
    `).all();

    const recentActivity = await env.DB.prepare(`
      SELECT DATE(created_at) as date, COUNT(*) as events
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
    }, {}, request, env, METHODS);
  } catch {
    return apiError('database_error', 500, 'Unable to load analytics', request, env, METHODS);
  }
}
