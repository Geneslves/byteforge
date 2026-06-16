# 数据库初始化问题 - 最终解决方案

## ❌ 问题根源

Wrangler 在启动时会创建一个**新的空数据库实例**，即使我们已经初始化过数据库。这导致：
- `no such table: rate_limits`
- `no such table: settings`
- 注册功能无法使用

## ✅ 解决方案

**在 Wrangler 启动后再初始化数据库**

### 当前状态

你的 Wrangler 服务正在运行，但数据库是空的。

### 立即执行

打开**新的** PowerShell 或命令提示符窗口：

```bash
cd E:\Code\byteforge
pnpm run db:init
```

等待看到：
```
🚣 29 commands executed successfully.
```

然后在浏览器访问并注册：
```
http://localhost:8788/login.html
```

## 🔄 以后每次启动的正确流程

```bash
# 1. 启动服务
start-server.bat

# 2. 等待 10 秒直到看到 "Ready on http://127.0.0.1:8788"

# 3. 在新终端初始化数据库
pnpm run db:init

# 4. 访问浏览器
```

---

**现在就打开新终端运行 `pnpm run db:init`！**
