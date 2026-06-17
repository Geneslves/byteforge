# ⚠️ 重要：如何正确启动开发环境

## 🔴 问题原因

使用 `pnpm dev` 只启动了 **Vite 静态文件服务器**（端口 5173），不包含 API 功能。

测试页面需要 **Cloudflare Functions API** 才能工作，所以点击按钮没有反应。

---

## ✅ 正确的启动方式

### 方式 1：使用 Wrangler Pages Dev（推荐）

```powershell
# 1. 先构建项目
pnpm build

# 2. 启动带 API 的开发服务器
pnpm run dev:local
```

**服务器地址：** http://localhost:8788

**特点：**
- ✅ 包含所有 API 功能
- ✅ 使用 D1 数据库
- ✅ 完整模拟生产环境
- ⚠️ 需要先构建（每次修改前端代码需要重新构建）

### 方式 2：使用 Vite Dev（仅前端开发）

```powershell
pnpm dev
```

**服务器地址：** http://localhost:5173

**特点：**
- ✅ 热更新，修改代码立即生效
- ❌ **没有 API 功能**
- ❌ 测试页面无法使用

---

## 🚀 现在就启动测试！

### 步骤 1：构建项目

```powershell
# 打开 PowerShell，进入项目目录
cd E:\Code\byteforge

# 构建
pnpm build
```

### 步骤 2：启动开发服务器

```powershell
# 启动带 API 的服务器
pnpm run dev:local
```

**等待看到：**
```
[wrangler:inf] Ready on http://localhost:8788
```

### 步骤 3：打开测试页面

在浏览器访问：
```
http://localhost:8788/test-auth-flow.html
```

**注意端口是 8788，不是 5173！**

---

## 📊 两种开发模式对比

| 特性 | Vite Dev (5173) | Wrangler Dev (8788) |
|-----|-----------------|---------------------|
| 热更新 | ✅ 立即生效 | ❌ 需要重新构建 |
| API 功能 | ❌ 不可用 | ✅ 完整支持 |
| D1 数据库 | ❌ 不可用 | ✅ 可用 |
| 测试认证 | ❌ 不可用 | ✅ 可用 |
| 适合场景 | 前端样式开发 | **API 测试、完整功能测试** |

---

## 🔄 开发工作流

### 场景 1：只修改前端样式/布局

```powershell
# 使用 Vite Dev（快速热更新）
pnpm dev

# 访问 http://localhost:5173
```

### 场景 2：测试 API 功能

```powershell
# 1. 构建
pnpm build

# 2. 启动 Wrangler Dev
pnpm run dev:local

# 访问 http://localhost:8788
```

### 场景 3：修改前端代码后测试 API

```powershell
# 1. 重新构建
pnpm build

# 2. 如果 dev:local 还在运行，刷新浏览器
# 如果没运行，重新启动 pnpm run dev:local
```

---

## 🎯 测试认证流程的完整步骤

### 1. 构建项目

```powershell
cd E:\Code\byteforge
pnpm build
```

**输出示例：**
```
✓ built in 232ms
Generated static route entries: /logs/, ...
Generated RSS feed: 26 items
```

### 2. 启动 Wrangler Dev

```powershell
pnpm run dev:local
```

**等待看到：**
```
[wrangler:inf] Ready on http://localhost:8788
```

**或者在新窗口中运行（推荐）：**
```powershell
# 新开一个 PowerShell 窗口
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd E:\Code\byteforge; pnpm run dev:local"
```

### 3. 测试 API

在另一个 PowerShell 窗口测试：

```powershell
# 测试健康检查
curl http://localhost:8788/api/health

# 应该看到：
# {"ok":true,"timestamp":"2026-06-15T..."}
```

### 4. 打开测试页面

浏览器访问：
```
http://localhost:8788/test-auth-flow.html
```

### 5. 测试所有功能

按顺序点击页面上的按钮：
1. 注册测试用户
2. 获取用户信息  
3. 刷新 Token
4. 模拟过期并自动刷新
5. 发送 105 次请求
6. 登出

---

## ⚡ 快速启动脚本

我已经为你创建了快速启动脚本：

```powershell
# 双击运行这个批处理文件
E:\Code\byteforge\start-dev-with-api.bat
```

或者命令行运行：

```powershell
cd E:\Code\byteforge
.\start-dev-with-api.bat
```

---

## 🔍 故障排查

### 问题 1：点击按钮没反应

**原因：** 使用了 5173 端口（Vite Dev），没有 API

**解决：** 改用 8788 端口（Wrangler Dev）

### 问题 2：API 返回 404

**原因：** 服务器还在启动，或使用错误的端口

**解决：** 
1. 确认看到 "Ready on http://localhost:8788"
2. 使用 8788 端口访问

### 问题 3：dev:local 启动失败

**可能原因：**
- 没有先构建（`pnpm build`）
- D1 数据库未配置
- 端口被占用

**解决：**
```powershell
# 1. 先构建
pnpm build

# 2. 检查端口
netstat -ano | findstr :8788

# 3. 如果端口被占用，停止进程
taskkill /PID <进程ID> /F

# 4. 重新启动
pnpm run dev:local
```

---

## 📝 记住这些

✅ **测试 API 功能 = 使用端口 8788**  
✅ **快速前端开发 = 使用端口 5173**  
✅ **测试前先构建 = pnpm build**  
✅ **API 测试页面 = http://localhost:8788/test-auth-flow.html**

---

## 🎯 现在就开始！

打开 PowerShell，执行：

```powershell
# 进入项目目录
cd E:\Code\byteforge

# 构建
pnpm build

# 启动服务器（会打开一个新窗口）
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd E:\Code\byteforge; pnpm run dev:local"

# 等待 10 秒，然后打开浏览器
Start-Sleep -Seconds 10
Start-Process "http://localhost:8788/test-auth-flow.html"
```

**或者手动操作：**

1. 运行 `pnpm build`
2. 运行 `pnpm run dev:local`
3. 等待看到 "Ready on http://localhost:8788"
4. 打开浏览器访问 http://localhost:8788/test-auth-flow.html

---

**准备好了吗？开始测试吧！** 🚀

测试完成后告诉我结果！
