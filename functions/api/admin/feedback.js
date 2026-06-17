/**
 * Admin Feedback API - 使用抽象层重写
 * 管理员反馈查看端点
 */

import { createHandler } from '../../lib/platform/adapter.js'
import { json, optionsResponse } from '../../lib/http.js'

const METHODS = 'GET, OPTIONS'

/**
 * GET /api/admin/feedback
 * 获取反馈列表（仅管理员）
 * 查询参数：
 * - limit: 每页数量（默认 50，最大 100）
 * - offset: 偏移量（默认 0）
 * - documentId: 过滤特定文档的反馈（可选）
 */
export const onRequestGet = createHandler({
  methods: METHODS,
  auth: 'admin', // 需要管理员权限
  schema: null,
  handler: async ({ request, env, db }) => {
    // 解析查询参数
    const url = new URL(request.url)
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 100)
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10), 0)
    const documentId = url.searchParams.get('documentId')

    // 构建查询
    let query = 'SELECT * FROM feedback'
    const params = []

    if (documentId) {
      query += ' WHERE document_id = ?'
      params.push(documentId)
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
    params.push(limit, offset)

    // 执行查询
    const results = await db.query(query, params)

    return json({
      ok: true,
      data: results || [],
      pagination: {
        limit,
        offset,
        count: results ? results.length : 0
      }
    }, {}, request, env, METHODS)
  }
})

/**
 * OPTIONS /api/admin/feedback
 * CORS 预检请求
 */
export const onRequestOptions = createHandler({
  methods: METHODS,
  handler: async ({ request, env }) => {
    return optionsResponse(request, env, METHODS)
  }
})
