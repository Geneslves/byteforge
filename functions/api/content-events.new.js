/**
 * Content Events API - 使用抽象层重写
 * 内容事件追踪端点（浏览、点击、搜索等）
 */

import { createHandler } from '../lib/platform/adapter.js'
import { json, optionsResponse } from '../lib/http.js'

const METHODS = 'POST, OPTIONS'
const VALID_EVENT_TYPES = ['view', 'click', 'search', 'share']

/**
 * POST /api/content-events
 * 记录内容事件
 */
export const onRequestPost = createHandler({
  methods: METHODS,
  auth: null, // 公开端点
  schema: {
    routePath: 'string',
    eventType: {
      type: 'string',
      enum: VALID_EVENT_TYPES
    },
    documentId: { type: 'string', required: false },
    userAgent: { type: 'string', required: false }
  },
  handler: async ({ request, env, db, body }) => {
    // 生成事件 ID
    const id = crypto.randomUUID()
    const createdAt = new Date().toISOString()

    // 获取 User-Agent
    const userAgent = body.userAgent || request.headers.get('user-agent') || ''

    // 插入事件记录
    await db.run(
      'INSERT INTO content_events (id, document_id, route_path, event_type, created_at, user_agent) VALUES (?, ?, ?, ?, ?, ?)',
      [
        id,
        body.documentId || null,
        body.routePath,
        body.eventType,
        createdAt,
        userAgent
      ]
    )

    return json({
      ok: true,
      id,
      created_at: createdAt
    }, {}, request, env, METHODS)
  }
})

/**
 * OPTIONS /api/content-events
 * CORS 预检请求
 */
export const onRequestOptions = createHandler({
  methods: METHODS,
  handler: async ({ request, env }) => {
    return optionsResponse(request, env, METHODS)
  }
})
