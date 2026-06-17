/**
 * Feedback API - 使用抽象层重写
 * 用户反馈收集端点
 */

import { createHandler } from '../lib/platform/adapter.js'
import { json, optionsResponse } from '../lib/http.js'

const METHODS = 'POST, OPTIONS'

/**
 * POST /api/feedback
 * 提交用户反馈
 */
export const onRequestPost = createHandler({
  methods: METHODS,
  auth: null, // 公开端点，不需要认证
  schema: {
    routePath: 'string',
    message: { type: 'string', min: 2, max: 1000 },
    documentId: { type: 'string', required: false },
    userAgent: { type: 'string', required: false }
  },
  handler: async ({ request, env, db, body }) => {
    // 生成反馈 ID
    const id = crypto.randomUUID()
    const createdAt = new Date().toISOString()

    // 获取 User-Agent（如果 body 中没有提供）
    const userAgent = body.userAgent || request.headers.get('user-agent') || ''

    // 插入反馈记录
    await db.run(
      'INSERT INTO feedback (id, document_id, route_path, message, created_at, user_agent) VALUES (?, ?, ?, ?, ?, ?)',
      [
        id,
        body.documentId || null,
        body.routePath,
        body.message.trim(),
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
 * OPTIONS /api/feedback
 * CORS 预检请求
 */
export const onRequestOptions = createHandler({
  methods: METHODS,
  handler: async ({ request, env }) => {
    return optionsResponse(request, env, METHODS)
  }
})
