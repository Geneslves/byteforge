/**
 * Admin Content Stats API - 使用抽象层重写
 * 内容统计数据端点
 */

import { createHandler } from '../../lib/platform/adapter.js'
import { json, optionsResponse } from '../../lib/http.js'

const METHODS = 'GET, OPTIONS'

/**
 * GET /api/admin/content-stats
 * 获取内容统计数据（仅管理员）
 * 查询参数：?documentId=xxx（可选，获取特定文档的统计）
 */
export const onRequestGet = createHandler({
  methods: METHODS,
  auth: 'admin', // 需要管理员权限
  schema: null,
  handler: async ({ request, env, db }) => {
    // 解析查询参数
    const url = new URL(request.url)
    const documentId = url.searchParams.get('documentId')

    // 如果指定了 documentId，返回该文档的详细统计
    if (documentId) {
      const stats = await db.query(`
        SELECT event_type, COUNT(*) as count, DATE(created_at) as date
        FROM content_events
        WHERE document_id = ?
        GROUP BY event_type, DATE(created_at)
        ORDER BY date DESC
      `, [documentId])

      const feedbackCount = await db.first(`
        SELECT COUNT(*) as count
        FROM feedback
        WHERE document_id = ?
      `, [documentId])

      return json({
        ok: true,
        documentId,
        events: stats || [],
        feedbackCount: feedbackCount?.count || 0
      }, {}, request, env, METHODS)
    }

    // 否则返回所有文档的统计汇总
    const allStats = await db.query(`
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
    `)

    // 获取反馈数量
    const feedbackCounts = await db.query(`
      SELECT document_id, COUNT(*) as count
      FROM feedback
      WHERE document_id IS NOT NULL
      GROUP BY document_id
    `)

    // 创建反馈计数映射
    const feedbackMap = Object.fromEntries(
      (feedbackCounts || []).map(item => [item.document_id, item.count])
    )

    // 合并统计数据和反馈数量
    const enriched = (allStats || []).map(stat => ({
      ...stat,
      feedback_count: feedbackMap[stat.document_id] || 0
    }))

    return json({
      ok: true,
      stats: enriched
    }, {}, request, env, METHODS)
  }
})

/**
 * OPTIONS /api/admin/content-stats
 * CORS 预检请求
 */
export const onRequestOptions = createHandler({
  methods: METHODS,
  handler: async ({ request, env }) => {
    return optionsResponse(request, env, METHODS)
  }
})
