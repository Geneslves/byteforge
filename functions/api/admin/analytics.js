/**
 * Admin Analytics API - 使用抽象层重写
 * 管理员分析数据端点
 */

import { createHandler } from '../../lib/platform/adapter.js'
import { json, optionsResponse } from '../../lib/http.js'

const METHODS = 'GET, OPTIONS'

/**
 * GET /api/admin/analytics
 * 获取站点分析数据（仅管理员）
 */
export const onRequestGet = createHandler({
  methods: METHODS,
  auth: 'admin', // 需要管理员权限
  schema: null, // GET 请求无需验证 body
  handler: async ({ request, env, db }) => {
    // 获取总体统计数据
    const stats = await db.first(`
      SELECT
        (SELECT COUNT(*) FROM feedback) as total_feedback,
        (SELECT COUNT(*) FROM content_events WHERE event_type = 'view') as total_views,
        (SELECT COUNT(*) FROM content_events WHERE event_type = 'click') as total_clicks,
        (SELECT COUNT(*) FROM content_events WHERE event_type = 'search') as total_searches
    `)

    // 获取浏览量最高的文档
    const topDocuments = await db.query(`
      SELECT document_id, COUNT(*) as views
      FROM content_events
      WHERE event_type = 'view' AND document_id IS NOT NULL
      GROUP BY document_id
      ORDER BY views DESC
      LIMIT 10
    `)

    // 获取最近 7 天的活动趋势
    const recentActivity = await db.query(`
      SELECT DATE(created_at) as date, COUNT(*) as events
      FROM content_events
      WHERE created_at >= datetime('now', '-7 days')
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `)

    return json({
      ok: true,
      stats: stats || {
        total_feedback: 0,
        total_views: 0,
        total_clicks: 0,
        total_searches: 0
      },
      topDocuments: topDocuments || [],
      recentActivity: recentActivity || []
    }, {}, request, env, METHODS)
  }
})

/**
 * OPTIONS /api/admin/analytics
 * CORS 预检请求
 */
export const onRequestOptions = createHandler({
  methods: METHODS,
  handler: async ({ request, env }) => {
    return optionsResponse(request, env, METHODS)
  }
})
