/**
 * Admin Feedback Delete API - 使用抽象层重写
 * 删除反馈端点
 */

import { createHandler } from '../../../lib/platform/adapter.js'
import { json, optionsResponse, apiError } from '../../../lib/http.js'

const METHODS = 'DELETE, OPTIONS'

/**
 * DELETE /api/admin/feedback/[id]
 * 删除指定反馈（仅管理员）
 */
export const onRequestDelete = createHandler({
  methods: METHODS,
  auth: 'admin', // 需要管理员权限
  schema: null,
  handler: async ({ request, env, db }) => {
    // 从 URL 路径中提取反馈 ID
    const url = new URL(request.url)
    const id = url.pathname.split('/').pop()

    // 验证 ID
    if (!id || id === 'delete') {
      return apiError('missing_id', 400, 'Feedback ID is required', request, env, METHODS)
    }

    // 删除反馈
    const result = await db.run('DELETE FROM feedback WHERE id = ?', [id])

    // 检查是否删除成功
    if (result.changes === 0) {
      return apiError('not_found', 404, 'Feedback not found', request, env, METHODS)
    }

    return json({
      ok: true,
      id,
      deleted: true
    }, {}, request, env, METHODS)
  }
})

/**
 * OPTIONS /api/admin/feedback/[id]
 * CORS 预检请求
 */
export const onRequestOptions = createHandler({
  methods: METHODS,
  handler: async ({ request, env }) => {
    return optionsResponse(request, env, METHODS)
  }
})
