/**
 * Admin Users API - 使用抽象层重写
 * 用户管理端点
 */

import { createHandler } from '../../lib/platform/adapter.js'
import { json, optionsResponse, apiError } from '../../lib/http.js'

const METHODS = 'GET, PATCH, OPTIONS'

/**
 * GET /api/admin/users
 * 获取用户列表（仅管理员）
 */
export const onRequestGet = createHandler({
  methods: METHODS,
  auth: 'admin', // 需要管理员权限
  schema: null,
  handler: async ({ request, env, db }) => {
    // 获取所有用户（不包括密码哈希）
    const users = await db.query(`
      SELECT id, username, email, role, is_active, created_at, last_login
      FROM users
      ORDER BY created_at DESC
    `)

    return json({
      ok: true,
      users: users || []
    }, {}, request, env, METHODS)
  }
})

/**
 * PATCH /api/admin/users
 * 更新用户信息（仅管理员）
 */
export const onRequestPatch = createHandler({
  methods: METHODS,
  auth: 'admin', // 需要管理员权限
  schema: {
    userId: 'string',
    isActive: { type: 'boolean', required: false },
    role: {
      type: 'string',
      enum: ['user', 'admin'],
      required: false
    }
  },
  handler: async ({ request, env, db, body, user }) => {
    const { userId, isActive, role } = body

    // 防止管理员禁用自己的账户
    if (userId === user.id && isActive === false) {
      return apiError('cannot_deactivate_self', 400, 'Cannot deactivate your own account', request, env, METHODS)
    }

    // 构建更新语句
    const updates = []
    const params = []

    if (typeof isActive === 'boolean') {
      updates.push('is_active = ?')
      params.push(isActive ? 1 : 0)
    }

    if (role) {
      updates.push('role = ?')
      params.push(role)
    }

    // 检查是否有有效的更新
    if (updates.length === 0) {
      return apiError('no_updates', 400, 'No valid updates provided', request, env, METHODS)
    }

    // 执行更新
    params.push(userId)
    await db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params)

    return json({
      ok: true,
      message: 'User updated successfully'
    }, {}, request, env, METHODS)
  }
})

/**
 * OPTIONS /api/admin/users
 * CORS 预检请求
 */
export const onRequestOptions = createHandler({
  methods: METHODS,
  handler: async ({ request, env }) => {
    return optionsResponse(request, env, METHODS)
  }
})
