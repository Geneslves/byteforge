/**
 * Auth Me API - 使用抽象层重写
 * 获取当前登录用户信息
 */

import { createHandler } from '../../lib/platform/adapter.js'
import { json, optionsResponse } from '../../lib/http.js'

const METHODS = 'GET, OPTIONS'

/**
 * GET /api/auth/me
 * 获取当前用户信息（需要认证）
 */
export const onRequestGet = createHandler({
  methods: METHODS,
  auth: 'user', // 需要用户认证（任何登录用户）
  schema: null, // GET 请求无需验证 body
  handler: async ({ request, env, user }) => {
    // user 对象由 createHandler 自动提供
    return json({
      ok: true,
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
 * OPTIONS /api/auth/me
 * CORS 预检请求
 */
export const onRequestOptions = createHandler({
  methods: METHODS,
  handler: async ({ request, env }) => {
    return optionsResponse(request, env, METHODS)
  }
})
