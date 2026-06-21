/**
 * Refresh Token API - 使用抽象层重写
 * 刷新访问令牌
 */

import { generateToken } from '../../../lib/auth.js'
import { createHandler } from '../../../lib/platform/adapter.js'
import { json, optionsResponse, apiError } from '../../../lib/http.js'

const METHODS = 'POST, OPTIONS'

/**
 * POST /api/v1/auth/refresh
 * 使用刷新令牌获取新的访问令牌
 */
export const onRequestPost = createHandler({
  methods: METHODS,
  auth: null, // 刷新端点不需要访问令牌认证
  schema: {
    refreshToken: 'string'
  },
  handler: async ({ request, env, db, body }) => {
    // 哈希刷新令牌用于查找
    const encoder = new TextEncoder()
    const data = encoder.encode(body.refreshToken)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    // 在数据库中查找刷新令牌
    const tokenRecord = await db.first(
      'SELECT * FROM refresh_tokens WHERE token_hash = ? AND expires_at > ? AND revoked = ?',
      [tokenHash, new Date().toISOString(), false]
    )

    if (!tokenRecord) {
      return apiError('invalid_refresh_token', 401, 'Invalid or expired refresh token', request, env, METHODS)
    }

    // 获取用户信息
    const user = await db.first(
      'SELECT id, username, email, role, is_active FROM users WHERE id = ?',
      [tokenRecord.user_id]
    )

    if (!user) {
      return apiError('user_not_found', 401, 'User not found', request, env, METHODS)
    }

    if (!user.is_active) {
      return apiError('user_inactive', 403, 'Your account has been deactivated', request, env, METHODS)
    }

    // 生成新的访问令牌
    const newAccessToken = await generateToken({
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    }, env)

    // 更新最后登录时间
    await db.run('UPDATE users SET last_login = ? WHERE id = ?', [
      new Date().toISOString(),
      user.id
    ])

    return json({
      ok: true,
      token: newAccessToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    }, {}, request, env, METHODS)
  }
})

/**
 * OPTIONS /api/v1/auth/refresh
 * CORS 预检请求
 */
export const onRequestOptions = createHandler({
  methods: METHODS,
  handler: async ({ request, env }) => {
    return optionsResponse(request, env, METHODS)
  }
})
