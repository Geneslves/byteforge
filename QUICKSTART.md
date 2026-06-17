# Quick Start Guide - Node.js/PostgreSQL

快速启动 ByteForge 的 Node.js 版本（使用 Docker）。

## 🚀 5 分钟快速启动

### 前提条件

- Docker 和 Docker Compose
- Node.js 18+ 和 pnpm

### 步骤 1: 克隆并安装

```bash
git clone <your-repo>
cd byteforge
pnpm install
```

### 步骤 2: 启动 Docker 服务

```bash
# 启动 PostgreSQL 和应用
pnpm run docker:up

# 等待服务启动（约 30 秒）
# 数据库会自动初始化
```

### 步骤 3: 访问应用

- **前端：** http://localhost:3000
- **API：** http://localhost:3000/api/health
- **pgAdmin：** http://localhost:5050 （可选）

### 步骤 4: 创建管理员用户

```bash
# 注册第一个用户（自动成为管理员）
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@byteforge.local",
    "password": "your-secure-password"
  }'
```

### 步骤 5: 测试

```bash
# 运行测试套件
node scripts/test-api-endpoints.js
```

---

## 🎯 常用命令

```bash
# 查看日志
pnpm run docker:logs

# 重启应用
pnpm run docker:restart

# 停止服务
pnpm run docker:down

# 完全清理（包括数据）
pnpm run docker:clean
```

---

## 🔧 自定义配置

编辑 `.env` 文件：

```env
# 修改端口
APP_PORT=3001

# 修改数据库密码
POSTGRES_PASSWORD=your-secure-password

# 修改 JWT 密钥
JWT_SECRET=your-jwt-secret
```

然后重启：

```bash
pnpm run docker:down
pnpm run docker:up
```

---

## 📊 服务状态

检查所有服务是否正常：

```bash
docker compose ps
```

应该看到：

```
NAME                COMMAND                  SERVICE   STATUS    PORTS
byteforge-app       "docker-entrypoint.s…"   app       running   0.0.0.0:3000->3000/tcp
byteforge-db        "docker-entrypoint.s…"   db        running   0.0.0.0:5432->5432/tcp
```

---

## 🐛 故障排除

### 端口冲突

```bash
# 修改 .env 文件中的端口
APP_PORT=3001
POSTGRES_PORT=5433

# 重新启动
pnpm run docker:down
pnpm run docker:up
```

### 查看错误日志

```bash
# 应用日志
docker compose logs app

# 数据库日志
docker compose logs db

# 所有日志
docker compose logs
```

### 重置数据库

```bash
# 警告：这会删除所有数据！
pnpm run docker:clean
pnpm run docker:up
```

---

## 📚 下一步

- 阅读 `DEPLOYMENT.md` 了解生产部署
- 阅读 `BACKEND_MIGRATION.md` 了解架构
- 运行 `pnpm run check` 进行完整检查

---

**提示：** 首次启动可能需要下载 Docker 镜像，大约 2-3 分钟。
