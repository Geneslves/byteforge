/**
 * Health Check API - 使用抽象层重写
 * 展示如何使用 createHandler 简化代码
 */

import { createHandler } from '../lib/platform/adapter.js'
import { json, optionsResponse } from '../lib/http.js'

const METHODS = 'GET, OPTIONS'

/**
 * GET /api/health
 * 返回 API 健康状态
 */
export const onRequestGet = createHandler({
  methods: METHODS,
  // 不需要认证
  auth: null,
  // 不需要验证请求体
  schema: null,
  handler: async ({ request, env, platform }) => {
    return json({
      ok: true,
      service: 'byteforge-api',
      version: '1.0.0',
      platform: platform,  // 'cloudflare', 'nodejs', or 'vercel'
      timestamp: new Date().toISOString()
    }, {}, request, env, METHODS)
  }
})

/**
 * OPTIONS /api/health
 * CORS 预检请求
 */
export const onRequestOptions = createHandler({
  methods: METHODS,
  handler: async ({ request, env }) => {
    return optionsResponse(request, env, METHODS)
  }
})
