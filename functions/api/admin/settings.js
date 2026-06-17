/**
 * Admin Settings API - 使用抽象层重写
 * 系统设置管理端点
 */

import { createHandler } from '../../lib/platform/adapter.js'
import { json, optionsResponse, apiError } from '../../lib/http.js'

const METHODS = 'GET, PUT, OPTIONS'

/**
 * GET /api/admin/settings
 * 获取系统设置（仅管理员）
 */
export const onRequestGet = createHandler({
  methods: METHODS,
  auth: 'admin', // 需要管理员权限
  schema: null,
  handler: async ({ request, env, db }) => {
    // 获取所有设置
    const settings = await db.query('SELECT key, value, updated_at FROM settings')

    // 转换为对象格式，并处理布尔值
    const settingsObj = {}
    for (const setting of settings || []) {
      settingsObj[setting.key] = setting.value === 'true'
        ? true
        : setting.value === 'false'
          ? false
          : setting.value
    }

    return json({
      ok: true,
      settings: settingsObj
    }, {}, request, env, METHODS)
  }
})

/**
 * PUT /api/admin/settings
 * 更新系统设置（仅管理员）
 */
export const onRequestPut = createHandler({
  methods: METHODS,
  auth: 'admin', // 需要管理员权限
  schema: {
    settings: {
      type: 'object',
      required: true
    }
  },
  handler: async ({ request, env, db, body }) => {
    const updates = body.settings

    // 验证 settings 不是数组
    if (Array.isArray(updates)) {
      return apiError('invalid_input', 400, 'Settings must be an object, not an array', request, env, METHODS)
    }

    // 更新每个设置项
    const now = new Date().toISOString()
    for (const [key, value] of Object.entries(updates)) {
      // 转换布尔值为字符串
      const stringValue = typeof value === 'boolean' ? value.toString() : String(value)

      // 使用 UPSERT 语法更新或插入
      await db.run(`
        INSERT INTO settings (key, value, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?
      `, [key, stringValue, now, stringValue, now])
    }

    return json({
      ok: true,
      message: 'Settings updated successfully'
    }, {}, request, env, METHODS)
  }
})

/**
 * OPTIONS /api/admin/settings
 * CORS 预检请求
 */
export const onRequestOptions = createHandler({
  methods: METHODS,
  handler: async ({ request, env }) => {
    return optionsResponse(request, env, METHODS)
  }
})
