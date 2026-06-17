/**
 * Node.js/Express Server for ByteForge
 * Multi-platform support - alternative to Cloudflare Pages
 */

import express from 'express'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import pg from 'pg'

const { Pool } = pg

// ES Module 支持
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 数据库连接池
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/byteforge',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

// 测试数据库连接
pool.on('connect', () => {
  console.log('✓ Database connected')
})

pool.on('error', (err) => {
  console.error('Database connection error:', err)
})

const app = express()

// 中间件
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// 静态文件服务
app.use(express.static(join(__dirname, '../dist')))

// CORS 支持
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200)
  }

  next()
})

// 请求日志
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`)
  next()
})

// API 路由适配器
// 将 Cloudflare Pages Function 适配到 Express
function adaptToExpress(cloudflareHandler) {
  return async (req, res) => {
    try {
      // 创建 Cloudflare 兼容的上下文
      const context = {
        req,
        res,
        request: createWebRequest(req),
        env: {
          ...process.env,
          DB_CLIENT: pool
        }
      }

      // 调用 Cloudflare handler
      const response = await cloudflareHandler(context)

      // 转换 Web API Response 到 Express response
      res.status(response.status)

      // 设置响应头
      for (const [key, value] of response.headers.entries()) {
        res.setHeader(key, value)
      }

      // 发送响应体
      const contentType = response.headers.get('content-type') || ''
      if (contentType.includes('application/json')) {
        const body = await response.json()
        res.json(body)
      } else {
        const body = await response.text()
        res.send(body)
      }
    } catch (error) {
      console.error('Request error:', error)
      res.status(500).json({
        ok: false,
        error: 'server_error',
        message: error.message
      })
    }
  }
}

// 创建 Web API Request 对象（从 Express request）
function createWebRequest(req) {
  const protocol = req.protocol || 'http'
  const host = req.get('host') || 'localhost'
  const url = `${protocol}://${host}${req.originalUrl}`

  return {
    method: req.method,
    url,
    headers: new Headers(req.headers),
    json: async () => req.body,
    text: async () => typeof req.body === 'string' ? req.body : JSON.stringify(req.body),
    formData: async () => req.body
  }
}

// 动态导入所有 API 路由
async function setupRoutes() {
  try {
    // 健康检查
    const { onRequestGet: healthGet } = await import('../functions/api/health.js')
    app.get('/api/health', adaptToExpress(healthGet))

    // 反馈
    const { onRequestPost: feedbackPost } = await import('../functions/api/feedback.js')
    app.post('/api/feedback', adaptToExpress(feedbackPost))

    // 内容事件
    const { onRequestPost: contentEventsPost } = await import('../functions/api/content-events.js')
    app.post('/api/content-events', adaptToExpress(contentEventsPost))

    // 认证端点
    const { onRequestPost: loginPost } = await import('../functions/api/auth/login.js')
    app.post('/api/auth/login', adaptToExpress(loginPost))

    const { onRequestPost: registerPost } = await import('../functions/api/auth/register.js')
    app.post('/api/auth/register', adaptToExpress(registerPost))

    const { onRequestGet: meGet } = await import('../functions/api/auth/me.js')
    app.get('/api/auth/me', adaptToExpress(meGet))

    // Token 刷新
    const { onRequestPost: refreshPost } = await import('../functions/api/v1/auth/refresh.js')
    app.post('/api/v1/auth/refresh', adaptToExpress(refreshPost))

    // 管理员端点
    const { onRequestGet: analyticsGet } = await import('../functions/api/admin/analytics.js')
    app.get('/api/admin/analytics', adaptToExpress(analyticsGet))

    const { onRequestGet: contentStatsGet } = await import('../functions/api/admin/content-stats.js')
    app.get('/api/admin/content-stats', adaptToExpress(contentStatsGet))

    const { onRequestGet: adminFeedbackGet } = await import('../functions/api/admin/feedback.js')
    app.get('/api/admin/feedback', adaptToExpress(adminFeedbackGet))

    const { onRequestDelete: feedbackDelete } = await import('../functions/api/admin/feedback/delete.js')
    app.delete('/api/admin/feedback/:id', adaptToExpress(feedbackDelete))

    const { onRequestGet: settingsGet, onRequestPut: settingsPut } = await import('../functions/api/admin/settings.js')
    app.get('/api/admin/settings', adaptToExpress(settingsGet))
    app.put('/api/admin/settings', adaptToExpress(settingsPut))

    const { onRequestGet: usersGet, onRequestPatch: usersPatch } = await import('../functions/api/admin/users.js')
    app.get('/api/admin/users', adaptToExpress(usersGet))
    app.patch('/api/admin/users', adaptToExpress(usersPatch))

    console.log('✓ All API routes configured')
  } catch (error) {
    console.error('Error setting up routes:', error)
    throw error
  }
}

// SPA 路由支持 - 所有非 API 路由返回 index.html
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, '../dist/index.html'))
})

// 错误处理
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err)
  res.status(500).json({
    ok: false,
    error: 'server_error',
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  })
})

// 启动服务器
async function start() {
  try {
    // 设置路由
    await setupRoutes()

    // 启动服务器
    const PORT = process.env.PORT || 3000
    const server = app.listen(PORT, () => {
      console.log('')
      console.log('🚀 ByteForge Server Started')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log(`📡 Server:    http://localhost:${PORT}`)
      console.log(`🔗 API:       http://localhost:${PORT}/api`)
      console.log(`💾 Database:  ${process.env.DATABASE_URL ? 'PostgreSQL' : 'Not configured'}`)
      console.log(`🌍 Platform:  Node.js/Express`)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('')
    })

    // 优雅关闭
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully')
      server.close(() => {
        console.log('Server closed')
        pool.end(() => {
          console.log('Database pool closed')
          process.exit(0)
        })
      })
    })

    process.on('SIGINT', () => {
      console.log('SIGINT received, shutting down gracefully')
      server.close(() => {
        console.log('Server closed')
        pool.end(() => {
          console.log('Database pool closed')
          process.exit(0)
        })
      })
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

// 启动
start()
