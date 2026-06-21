/**
 * Register API - 使用抽象层重写
 * 用户注册端点
 */

import {
  generateToken,
  hashPassword,
  validateEmail,
  validatePassword,
  validateUsername
} from '../../lib/auth.js'
import { createHandler } from '../../lib/platform/adapter.js'
import { json, optionsResponse, apiError } from '../../lib/http.js'

const METHODS = 'POST, OPTIONS'

/**
 * POST /api/auth/register
 * 用户注册
 */
export const onRequestPost = createHandler({
  methods: METHODS,
  auth: null, // 注册端点不需要认证
  schema: {
    username: {
      type: 'string',
      validator: validateUsername
    },
    email: {
      type: 'string',
      validator: validateEmail
    },
    password: {
      type: 'string',
      validator: validatePassword
    }
  },
  handler: async ({ request, env, db, body }) => {
    // 检查是否允许注册
    const setting = await db.first(
      "SELECT value FROM settings WHERE key = 'registration_enabled'"
    )

    if (setting?.value === 'false') {
      return apiError('registration_disabled', 403, 'Registration is currently disabled', request, env, METHODS)
    }

    // 检查用户名或邮箱是否已存在
    const existing = await db.first(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [body.username, body.email]
    )

    if (existing) {
      return apiError('user_exists', 409, 'Username or email already exists', request, env, METHODS)
    }

    // 哈希密码
    const passwordHash = await hashPassword(body.password)

    // 如果是第一个用户，设为管理员
    const userCount = await db.first('SELECT COUNT(*) as count FROM users')
    const role = Number(userCount.count) === 0 ? 'admin' : 'user'

    // 创建用户
    const userId = crypto.randomUUID()
    const now = new Date().toISOString()

    await db.run(
      'INSERT INTO users (id, username, email, password_hash, role, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, body.username, body.email, passwordHash, role, true, now]
    )

    // 生成访问令牌
    const token = await generateToken({
      userId,
      username: body.username,
      email: body.email,
      role
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
      [refreshTokenId, userId, refreshTokenHash, refreshTokenExpiry, now, false]
    )

    // 返回用户信息和令牌
    return json({
      ok: true,
      user: {
        id: userId,
        username: body.username,
        email: body.email,
        role
      },
      token,
      refreshToken: refreshTokenValue
    }, {}, request, env, METHODS)
  }
})

/**
 * OPTIONS /api/auth/register
 * CORS 预检请求
 */
export const onRequestOptions = createHandler({
  methods: METHODS,
  handler: async ({ request, env }) => {
    return optionsResponse(request, env, METHODS)
  }
})
