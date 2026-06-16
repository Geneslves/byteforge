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
    const documentId = url.searchParams.get('documentId');

    if (documentId) {
      const stats = await env.DB.prepare(`
        SELECT event_type, COUNT(*) as count, DATE(created_at) as date
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
      }, {}, request, env, METHODS);
    }

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

    const feedbackCounts = await env.DB.prepare(`
      SELECT document_id, COUNT(*) as count
      FROM feedback
      WHERE document_id IS NOT NULL
      GROUP BY document_id
    `).all();

    const feedbackMap = Object.fromEntries((feedbackCounts.results || []).map((item) => [
      item.document_id,
      item.count,
    ]));

    const enriched = (allStats.results || []).map((stat) => ({
      ...stat,
      feedback_count: feedbackMap[stat.document_id] || 0,
    }));

    return json({ ok: true, stats: enriched }, {}, request, env, METHODS);
  } catch {
    return apiError('database_error', 500, 'Unable to load content statistics', request, env, METHODS);
  }
}
