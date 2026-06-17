# Multi-Platform Deployment Guide

ByteForge 现在支持在多个平台上部署。本指南涵盖所有支持的平台。

## 📋 支持的平台

| 平台 | 数据库 | 运行时 | CDN | 边缘函数 |
|------|--------|--------|-----|----------|
| **Cloudflare Pages** | D1 | Workers | ✅ | ✅ |
| **Node.js/Express** | PostgreSQL | Node.js | ❌ | ❌ |
| **Vercel** | Vercel Postgres | Serverless | ✅ | ✅ |

---

## 🚀 部署方式

### 方式 1: Cloudflare Pages（推荐）

**优点：**
- 全球 CDN
- 边缘计算
- 免费额度充足
- D1 数据库

**步骤：**

```bash
# 1. 构建项目
pnpm build

# 2. 初始化数据库
pnpm run db:init

# 3. 部署
wrangler pages deploy dist

# 4. 配置环境变量（在 Cloudflare Dashboard）
# - JWT_SECRET
# - 绑定 D1 数据库
```

**环境变量：**
- `JWT_SECRET` - JWT 密钥
- D1 绑定名称：`DB`

---

### 方式 2: Node.js/Express + PostgreSQL

**优点：**
- 完全控制
- 可自托管
- 成熟的技术栈
- PostgreSQL 数据库

**步骤：**

#### A. 本地开发

```bash
# 1. 安装依赖
pnpm install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，设置 DATABASE_URL

# 3. 初始化数据库
pnpm run postgres:migrate

# 4. 构建前端
pnpm build

# 5. 启动服务器
pnpm run dev:nodejs
```

访问 http://localhost:3000

#### B. Docker 部署（推荐）

```bash
# 1. 启动所有服务（应用 + PostgreSQL）
pnpm run docker:up

# 2. 查看日志
pnpm run docker:logs

# 3. 访问应用
# http://localhost:3000

# 4. 停止服务
pnpm run docker:down
```

**包含的服务：**
- `app` - ByteForge 应用（端口 3000）
- `db` - PostgreSQL 数据库（端口 5432）
- `pgadmin` - 数据库管理工具（端口 5050，可选）

**pgAdmin 访问：**
- URL: http://localhost:5050
- Email: admin@byteforge.local
- Password: admin

#### C. 生产部署

**使用 Docker Compose：**

```bash
# 1. 创建生产环境配置
cp .env.example .env

# 2. 修改 .env 文件
# - 设置强密码
# - 更改 JWT_SECRET
# - 配置域名

# 3. 构建镜像
docker compose build

# 4. 启动服务
docker compose up -d

# 5. 检查状态
docker compose ps

# 6. 查看日志
docker compose logs -f
```

**使用反向代理（Nginx）：**

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**使用 PM2（进程管理）：**

```bash
# 安装 PM2
npm install -g pm2

# 启动应用
pm2 start server/index.js --name byteforge

# 查看状态
pm2 status

# 查看日志
pm2 logs byteforge

# 重启
pm2 restart byteforge

# 开机自启
pm2 startup
pm2 save
```

---

### 方式 3: Vercel

**优点：**
- 零配置部署
- 自动 HTTPS
- 全球 CDN
- Vercel Postgres

**步骤：**

```bash
# 1. 安装 Vercel CLI
npm install -g vercel

# 2. 登录
vercel login

# 3. 部署
vercel

# 4. 在 Vercel Dashboard 中：
# - 添加 Vercel Postgres
# - 设置环境变量
# - 配置自定义域名
```

**环境变量：**
- `DATABASE_URL` - 自动设置（Vercel Postgres）
- `JWT_SECRET` - 手动设置

---

## 🗄️ 数据库迁移

### Cloudflare D1

```bash
# 本地初始化
pnpm run db:init

# 远程迁移
wrangler d1 execute byteforge --remote --file=./schema/d1.sql
```

### PostgreSQL

```bash
# 方式 1: 使用迁移脚本
DATABASE_URL=postgresql://user:pass@localhost:5432/byteforge pnpm run postgres:migrate

# 方式 2: 直接执行 SQL
psql -U user -d byteforge -f schema/postgres.sql

# 方式 3: Docker 自动初始化
# schema/postgres.sql 会在容器首次启动时自动执行
```

---

## 🔧 环境变量配置

### 必需的环境变量

| 变量 | 说明 | 示例 |
|------|------|------|
| `DATABASE_URL` | PostgreSQL 连接字符串 | `postgresql://user:pass@localhost:5432/byteforge` |
| `JWT_SECRET` | JWT 签名密钥 | `your-secret-key-change-in-production` |

### 可选的环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `NODE_ENV` | 环境 | `production` |
| `PORT` | 端口 | `3000` |

### 生成安全的 JWT_SECRET

```bash
# 使用 Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 使用 OpenSSL
openssl rand -hex 32
```

---

## 📊 性能对比

| 指标 | Cloudflare Pages | Node.js/Docker | Vercel |
|------|------------------|----------------|--------|
| 冷启动 | ~50ms | ~0ms | ~100ms |
| 响应时间 | ~20ms | ~30ms | ~50ms |
| 全球延迟 | 最低 | 取决于部署 | 低 |
| 扩展性 | 自动 | 手动 | 自动 |
| 成本 | 免费额度大 | 服务器成本 | 免费额度大 |

---

## 🔍 健康检查

所有平台都提供健康检查端点：

```bash
# 检查 API 状态
curl http://your-domain.com/api/health

# 响应示例
{
  "ok": true,
  "service": "byteforge-api",
  "version": "1.0.0",
  "timestamp": "2026-06-17T..."
}
```

---

## 🐛 故障排除

### Node.js/PostgreSQL

**问题：数据库连接失败**
```bash
# 检查 PostgreSQL 是否运行
docker compose ps

# 查看数据库日志
docker compose logs db

# 测试连接
psql -U byteforge -h localhost -d byteforge
```

**问题：端口已被占用**
```bash
# 修改 .env 文件中的端口
PORT=3001

# 或使用不同的 Docker 端口
APP_PORT=3001 docker compose up
```

**问题：权限错误**
```bash
# 确保非 root 用户有权限
chown -R nodejs:nodejs /app

# 检查文件权限
ls -la server/
```

### Docker

**问题：容器无法启动**
```bash
# 查看详细日志
docker compose logs --tail=100 app

# 重建镜像
docker compose build --no-cache

# 清理并重启
docker compose down -v
docker compose up -d
```

**问题：数据库初始化失败**
```bash
# 手动初始化
docker compose exec db psql -U byteforge -d byteforge -f /docker-entrypoint-initdb.d/init.sql
```

---

## 📚 相关命令

### 开发

```bash
# 前端开发服务器
pnpm run dev                  # Vite (http://localhost:5173)

# API 开发服务器
pnpm run dev:api              # Cloudflare (http://localhost:8788)
pnpm run dev:nodejs           # Node.js (http://localhost:3000)
```

### 构建

```bash
# 构建前端
pnpm build

# 构建 Docker 镜像
docker compose build
```

### 数据库

```bash
# D1 (Cloudflare)
pnpm run db:init              # 初始化
pnpm run db:migrate           # 迁移
pnpm run db:view              # 查看数据

# PostgreSQL
pnpm run postgres:migrate     # 初始化/迁移
```

### Docker

```bash
pnpm run docker:up            # 启动所有服务
pnpm run docker:down          # 停止所有服务
pnpm run docker:logs          # 查看日志
pnpm run docker:restart       # 重启应用
pnpm run docker:clean         # 清理（包括数据）
```

---

## 🎯 推荐方案

**开发环境：**
- Cloudflare Pages (本地) - 与生产环境一致
- 或 Docker - 完整的 PostgreSQL 环境

**生产环境：**
- **小型项目/个人博客：** Cloudflare Pages（免费，性能好）
- **企业应用：** Node.js/Docker（完全控制）
- **快速原型：** Vercel（零配置）

---

## ✅ 部署清单

### 部署前

- [ ] 更新 `.env` 文件
- [ ] 设置强 JWT_SECRET
- [ ] 配置数据库
- [ ] 运行构建：`pnpm build`
- [ ] 测试本地：`pnpm run dev:nodejs`

### 部署后

- [ ] 测试健康检查：`/api/health`
- [ ] 创建第一个管理员用户
- [ ] 测试所有 API 端点
- [ ] 配置域名和 SSL
- [ ] 设置监控和日志

### 安全

- [ ] 更改默认密码
- [ ] 启用 HTTPS
- [ ] 配置 CORS
- [ ] 设置速率限制
- [ ] 定期备份数据库

---

## 📞 获取帮助

- **文档：** `BACKEND_MIGRATION.md`
- **API 测试：** `node scripts/test-api-endpoints.js`
- **健康检查：** `/api/health`

---

**最后更新：** 2026-06-17
