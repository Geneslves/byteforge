/**
 * Login API - 使用抽象层重写
 * 用户登录端点
 */

import { generateToken, verifyPassword } from '../../lib/auth.js'
import { createHandler } from '../../lib/platform/adapter.js'
import { json, optionsResponse, apiError } from '../../lib/http.js'

const METHODS = 'POST, OPTIONS'

/**
 * POST /api/auth/login
 * 用户登录
 */
export const onRequestPost = createHandler({
  methods: METHODS,
  auth: null, // 登录端点不需要认证
  schema: {
    username: 'string',
    password: 'string'
  },
  handler: async ({ request, env, db, body }) => {
    // 查找用户（支持用户名或邮箱登录）
    const user = await db.first(
      'SELECT id, username, email, password_hash, role, is_active FROM users WHERE username = ? OR email = ?',
      [body.username, body.username]
    )

    // 用户不存在
    if (!user) {
      return apiError('invalid_credentials', 401, 'Invalid username or password', request, env, METHODS)
    }

    // 账户已被禁用
    if (!user.is_active) {
      return apiError('user_inactive', 403, 'Your account has been deactivated', request, env, METHODS)
    }

    // 验证密码
    const isValid = await verifyPassword(body.password, user.password_hash)
    if (!isValid) {
      return apiError('invalid_credentials', 401, 'Invalid username or password', request, env, METHODS)
    }

    // 更新最后登录时间
    const now = new Date().toISOString()
    await db.run('UPDATE users SET last_login = ? WHERE id = ?', [now, user.id])

    // 生成访问令牌
    const token = await generateToken({
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    }, env)

    // 生成刷新令牌
    const refreshTokenValue = crypto.randomUUID()

    // 哈希刷新令牌用于存储
    const encoder = new TextEncoder()
    const data = encoder.encode(refreshTokenValue)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const refreshTokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    // 存储刷新令牌（30 天过期）
    const refreshTokenId = crypto.randomUUID()
    const refreshTokenExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    await db.run(
      'INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at, revoked) VALUES (?, ?, ?, ?, ?, ?)',
      [refreshTokenId, user.id, refreshTokenHash, refreshTokenExpiry, now, false]
    )

    // 返回用户信息和令牌
    return json({
      ok: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      token,
      refreshToken: refreshTokenValue
    }, {}, request, env, METHODS)
  }
})

/**
 * OPTIONS /api/auth/login
 * CORS 预检请求
 */
export const onRequestOptions = createHandler({
  methods: METHODS,
  handler: async ({ request, env }) => {
    return optionsResponse(request, env, METHODS)
  }
})
