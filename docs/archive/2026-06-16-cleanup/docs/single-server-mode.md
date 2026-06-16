# Wrangler 单服务模式说明

## ✅ 当前运行状态

**只启动了一个服务：**
- ✅ **Wrangler**: `http://localhost:8788`

## 🎯 Wrangler 单服务模式的特点

### 它提供什么？

Wrangler 一个服务提供**所有功能**：

1. **静态前端页面** (从 `dist/` 目录)
   - ✅ `http://localhost:8788/` - 主页
   - ✅ `http://localhost:8788/login.html` - 登录页
   - ✅ `http://localhost:8788/nav.html` - 导航中心
   - ✅ `http://localhost:8788/admin-v2.html` - 管理后台
   - ✅ 所有 CSS、JS、图片等资源

2. **API 接口** (从 `functions/` 目录)
   - ✅ `http://localhost:8788/api/health` - 健康检查
   - ✅ `http://localhost:8788/api/auth/register` - 注册
   - ✅ `http://localhost:8788/api/auth/login` - 登录
   - ✅ `http://localhost:8788/api/admin/*` - 管理接口
   - ✅ `http://localhost:8788/api/feedback` - 反馈接口

3. **数据库** (D1 SQLite)
   - ✅ 用户数据存储
   - ✅ 反馈数据存储
   - ✅ 会话管理

## 📊 对比两种模式

### 🔹 双服务模式（开发推荐）

```
Vite (5173) + Wrangler (8788)
```

**优点：**
- ⚡ **热更新** - 修改 CSS/JS 立即生效，无需刷新
- 🎨 **开发体验好** - 实时预览
- 🐛 **调试方便** - 源码映射清晰

**缺点：**
- 🔧 需要启动两个服务
- 💻 占用两个端口
- 📁 需要理解前后端分离

**使用场景：**
- ✅ 日常开发
- ✅ 调整样式
- ✅ 编写前端代码

### 🔸 单服务模式（测试推荐）

```
只有 Wrangler (8788)
```

**优点：**
- 🚀 **完整功能** - 前端+后端+数据库全都有
- 🎯 **接近生产** - 模拟真实部署环境
- 🔧 **简单** - 只需一个命令

**缺点：**
- ❌ **无热更新** - 修改后需要重新 build
- 🐌 **开发慢** - 每次修改都要：
  1. 修改代码
  2. `pnpm run build`
  3. 刷新浏览器

**使用场景：**
- ✅ 功能测试
- ✅ 完整流程测试
- ✅ 模拟生产环境
- ✅ 演示给他人

## 🧪 现在可以测试的功能

访问 `http://localhost:8788/login.html`，你可以：

1. **注册新用户**
   - ✅ 填写表单
   - ✅ 提交注册
   - ✅ 数据写入数据库
   - ✅ 获得 JWT token
   - ✅ 自动跳转

2. **登录用户**
   - ✅ 输入用户名/密码
   - ✅ 验证身份
   - ✅ 获得访问令牌

3. **访问导航中心**
   - 访问 `http://localhost:8788/nav.html`
   - ✅ 权限检测正常
   - ✅ 非管理员看到锁定的 Admin 卡片

4. **管理后台** (需要管理员权限)
   - 访问 `http://localhost:8788/admin-v2.html`
   - ✅ 权限验证正常
   - ❌ 非管理员会被拦截并重定向

## 🔑 创建管理员测试

### 1. 先注册一个用户
```
访问: http://localhost:8788/login.html
用户名: admin
邮箱: admin@byteforge.dev
密码: Admin123456789
```

### 2. 提升为管理员
```bash
wrangler d1 execute byteforge --command "UPDATE users SET role='admin' WHERE username='admin'"
```

### 3. 验证权限
```bash
pnpm run db:admins
```

### 4. 登录测试
- 使用 admin 账号登录
- 访问 `/nav.html` - Admin 卡片应该可用
- 进入 `/admin-v2.html` - 应该能访问管理后台

## 🔄 何时使用单服务模式？

### ✅ 适合场景

1. **快速测试完整流程**
   - 注册 → 登录 → 使用功能
   - 不需要修改代码

2. **演示给其他人**
   - 只需要一个链接
   - `http://localhost:8788`

3. **测试部署前验证**
   - 模拟生产环境
   - 发现潜在问题

4. **不需要频繁修改前端**
   - 只调试后端 API
   - 只修改数据库

### ❌ 不适合场景

1. **调整样式**
   - 每次修改 CSS 都要 build
   - 效率太低

2. **开发新页面**
   - 需要实时预览
   - 双服务模式更好

3. **调试前端 JavaScript**
   - 需要源码映射
   - 需要热更新

## 💡 推荐工作流

```
开发时        → 双服务模式 (Vite + Wrangler)
修改样式      → 双服务模式
测试功能      → 单服务模式 (只 Wrangler) ✅ 当前
演示项目      → 单服务模式
调试后端      → 单服务模式
```

## 🚀 启动命令对比

### 双服务模式
```bash
# 方式 1: 使用脚本
start-dev-full.bat

# 方式 2: 手动启动
# 终端 1
pnpm run dev

# 终端 2
pnpm run build
pnpm run dev:api
```

访问：`http://localhost:5173`

### 单服务模式 ✅ 当前
```bash
pnpm run build
pnpm run dev:local
```

访问：`http://localhost:8788`

## 📝 当前状态总结

- ✅ **Wrangler 已启动**: `http://localhost:8788`
- ✅ **前端可访问**: 所有页面都能打开
- ✅ **API 可用**: 注册/登录/管理功能正常
- ✅ **数据库连接**: D1 数据库正常工作
- ❌ **热更新**: 无（这是单服务模式的取舍）

## 🎯 现在去试试吧！

访问 `http://localhost:8788/login.html` 测试完整的注册登录流程！

---

**提示：** 如果需要修改样式或前端代码，建议切换回双服务模式以获得更好的开发体验。
