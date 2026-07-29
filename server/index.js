/**
 * Node.js/Express Server for ByteForge
 * Multi-platform support - alternative to Cloudflare Pages
 */

import express from 'express'
import helmet from 'helmet'
import { ipKeyGenerator, rateLimit } from 'express-rate-limit'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync } from 'fs'
import pg from 'pg'
import { createPostgresConfig } from './postgres-config.js'
import { RateLimitPresets } from '../functions/lib/rate-limit/index.js'

const { Pool } = pg

// ES Module 支持
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 数据库连接池
const pool = new Pool(createPostgresConfig(process.env, {
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
}))

// 测试数据库连接
pool.on('connect', () => {
  console.log('✓ Database connected')
})

pool.on('error', (err) => {
  console.error('Database connection error:', err)
})

const app = express()
const canonicalOrigin = process.env.SITE_URL || process.env.SITE_ORIGIN || 'https://www.thebyte.tech'
const allowedOrigins = new Set(
  (process.env.ALLOWED_ORIGINS || canonicalOrigin)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
)

app.disable('x-powered-by')
app.set('trust proxy', 1)

app.use(helmet({
  contentSecurityPolicy: {
    reportOnly: true,
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      imgSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    },
  },
  strictTransportSecurity: process.env.NODE_ENV === 'production'
    ? { maxAge: 31536000, includeSubDomains: true, preload: true }
    : false,
}))
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()')
  next()
})
app.use(express.json())

// 中间件
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// CORS 支持
app.use((req, res, next) => {
  const origin = req.get('Origin')
  res.vary('Origin')

  if (origin && !allowedOrigins.has(origin)) {
    return res.status(403).json({
      ok: false,
      error: 'origin_not_allowed',
      message: 'Origin is not allowed',
    })
  }

  if (origin) {
    res.header('Access-Control-Allow-Origin', origin)
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204)
  }

  next()
})

// 请求日志
app.use((req, res, next) => {
  if (!req.path.startsWith('/api/health')) {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`)
  }
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
        message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
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
    const live = (req, res) => {
      res.setHeader('Cache-Control', 'no-store')
      res.json({
        ok: true,
        status: 'live',
        service: 'byteforge-api',
        timestamp: new Date().toISOString(),
      })
    }

    const ready = async (req, res) => {
      res.setHeader('Cache-Control', 'no-store')
      try {
        await pool.query('SELECT 1')
        res.json({
          ok: true,
          status: 'ready',
          service: 'byteforge-api',
          database: 'postgresql',
          timestamp: new Date().toISOString(),
        })
      } catch (error) {
        console.error('Readiness check failed:', error.message)
        res.status(503).json({
          ok: false,
          status: 'not_ready',
          service: 'byteforge-api',
          database: 'unavailable',
          timestamp: new Date().toISOString(),
        })
      }
    }

    app.get('/api/health', live)
    app.get('/api/health/live', live)
    app.get('/api/health/ready', ready)

    const strictAuthLimiter = rateLimit({
      windowMs: RateLimitPresets.strict.windowMs,
      limit: RateLimitPresets.strict.maxRequests,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      keyGenerator: (req) => ipKeyGenerator(req.get('cf-connecting-ip') || req.ip),
      message: {
        ok: false,
        error: 'rate_limit_exceeded',
        message: 'Too many authentication attempts; try again later',
      },
    })
    const registrationGate = (req, res, next) => {
      if (process.env.REGISTRATION_ENABLED === 'true') {
        return next()
      }

      return res.status(403).json({
        ok: false,
        error: 'registration_disabled',
        message: 'Registration is currently disabled',
      })
    }

    // 反馈
    const { onRequestPost: feedbackPost } = await import('../functions/api/feedback.js')
    app.post('/api/feedback', adaptToExpress(feedbackPost))

    // 内容事件
    const { onRequestPost: contentEventsPost } = await import('../functions/api/content-events.js')
    app.post('/api/content-events', adaptToExpress(contentEventsPost))

    // 认证端点
    const { onRequestPost: loginPost } = await import('../functions/api/auth/login.js')
    app.post('/api/auth/login', strictAuthLimiter, adaptToExpress(loginPost))

    const { onRequestPost: registerPost } = await import('../functions/api/auth/register.js')
    app.get('/api/auth/registration-status', (req, res) => {
      res.setHeader('Cache-Control', 'no-store')
      res.json({
        ok: true,
        enabled: process.env.REGISTRATION_ENABLED === 'true',
      })
    })
    app.post('/api/auth/register', registrationGate, strictAuthLimiter, adaptToExpress(registerPost))

    const { onRequestGet: meGet } = await import('../functions/api/auth/me.js')
    app.get('/api/auth/me', adaptToExpress(meGet))

    // Token 刷新
    const { onRequestPost: refreshPost } = await import('../functions/api/v1/auth/refresh.js')
    app.post('/api/v1/auth/refresh', strictAuthLimiter, adaptToExpress(refreshPost))

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

// 启动服务器
async function start() {
  try {
    const staticRoot = join(__dirname, '../dist')
    const immutableStaticOptions = {
      maxAge: '1y',
      immutable: true,
    }

    // 设置 API 路由（优先级最高）
    await setupRoutes()

    app.use('/api', (req, res) => {
      res.status(404).json({
        ok: false,
        error: 'not_found',
        message: 'API endpoint not found',
      })
    })

    // 静态文件服务（API 路由之后）
    app.use('/assets', express.static(join(staticRoot, 'assets'), immutableStaticOptions))
    app.use('/pagefind', express.static(join(staticRoot, 'pagefind'), immutableStaticOptions))
    app.use('/audio', express.static(join(staticRoot, 'audio'), {
      maxAge: '30d',
      immutable: true,
    }))
    app.use(express.static(staticRoot, {
      maxAge: '0',
      etag: true,
    }))

    // SPA 路由支持 - 所有非 API 路由返回 index.html
    const routeManifest = JSON.parse(readFileSync(join(staticRoot, 'route-manifest.json'), 'utf8'))
    const spaRoutes = new Set(routeManifest.spaRoutes || [])

    app.get('*', (req, res) => {
      const normalizedPath = req.path === '/' ? '/' : req.path.replace(/\/$/, '')
      if (spaRoutes.has(normalizedPath)) {
        const routeEntry = normalizedPath === '/'
          ? join(staticRoot, 'index.html')
          : join(staticRoot, normalizedPath.slice(1), 'index.html')
        res.setHeader('Cache-Control', 'no-cache')
        return res.sendFile(routeEntry)
      }

      res.status(404)
      return res.sendFile(join(staticRoot, '404.html'))
    })

    app.use((req, res) => {
      res.status(404)
      res.sendFile(join(staticRoot, '404.html'))
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
    const PORT = process.env.PORT || 3000
    const server = app.listen(PORT, () => {
      console.log('')
      console.log('🚀 ByteForge Server Started')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log(`📡 Server:    http://localhost:${PORT}`)
      console.log(`🔗 API:       http://localhost:${PORT}/api`)
      console.log(`💾 Database:  ${process.env.DATABASE_URL || process.env.PGHOST || process.env.POSTGRES_HOST ? 'PostgreSQL' : 'Not configured'}`)
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
