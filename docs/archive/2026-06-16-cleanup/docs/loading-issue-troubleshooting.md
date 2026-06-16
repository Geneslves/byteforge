# 页面一直加载的问题排查

## ❌ 问题现象

访问 `http://localhost:8788/login.html` 页面一直显示加载中，无法显示内容。

## 🔍 可能的原因

### 1. Wrangler 服务未正常启动

**检查方法：**
在运行 Wrangler 的终端窗口，应该看到：
```
⎔ Starting local server...
[wrangler:info] Ready on http://127.0.0.1:8788
```

**如果没有看到：**
- 服务启动失败
- 端口被占用
- 构建出错

### 2. 端口 8788 被占用

**检查命令：**
```powershell
netstat -ano | findstr :8788
```

**解决方案：**
```powershell
# 找到占用端口的进程 PID
netstat -ano | findstr :8788

# 结束该进程（替换 PID）
taskkill /PID <进程ID> /F
```

### 3. 浏览器缓存问题

**解决方案：**
- 按 `Ctrl + Shift + R` 强制刷新
- 或清除浏览器缓存
- 或使用无痕模式

### 4. JavaScript 加载错误

**检查方法：**
1. 按 `F12` 打开开发者工具
2. 查看 Console 标签是否有错误
3. 查看 Network 标签查看请求状态

**常见错误：**
- 404 错误：资源文件未找到
- CORS 错误：跨域问题
- 连接超时：服务未响应

## ✅ 完整解决方案

### 方案 1：使用启动脚本（推荐）

1. **双击运行：**
   ```
   start-server.bat
   ```

2. **等待看到这行：**
   ```
   [wrangler:info] Ready on http://127.0.0.1:8788
   ```

3. **打开浏览器访问：**
   ```
   http://localhost:8788/login.html
   ```

### 方案 2：手动启动

1. **打开新的 PowerShell 窗口**

2. **进入项目目录：**
   ```powershell
   cd E:\Code\byteforge
   ```

3. **启动服务：**
   ```powershell
   pnpm run dev:local
   ```

4. **等待服务就绪后访问页面**

### 方案 3：检查并修复

```powershell
# 1. 停止所有 Node 进程
taskkill /F /IM node.exe

# 2. 等待 5 秒
Start-Sleep -Seconds 5

# 3. 清理端口
# 如果 8788 被占用，找到并结束进程
$port = 8788
$process = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
if ($process) {
    Stop-Process -Id $process.OwningProcess -Force
}

# 4. 重新启动
cd E:\Code\byteforge
pnpm run dev:local
```

## 🧪 验证步骤

### 1. 测试 API 是否响应

```powershell
Invoke-RestMethod -Uri "http://localhost:8788/api/health"
```

**期望输出：**
```json
{
  "ok": true,
  "service": "byteforge-api",
  "version": "1.0.0"
}
```

### 2. 测试页面是否可访问

```powershell
(Invoke-WebRequest -Uri "http://localhost:8788/login.html" -UseBasicParsing).StatusCode
```

**期望输出：**
```
200
```

### 3. 检查浏览器控制台

打开 `http://localhost:8788/login.html` 并按 `F12`：

**正常情况应该看到：**
```
[ByteForge Auth V2] System initialized
```

**如果看到错误：**
- `Failed to fetch` → API 未响应
- `404 Not Found` → 资源文件缺失
- `CORS error` → 跨域配置问题

## 🎯 最常见的问题

### 问题：服务启动但浏览器无法访问

**原因：** 防火墙阻止

**解决：**
```powershell
# 添加防火墙规则
netsh advfirewall firewall add rule name="Wrangler Dev Server" dir=in action=allow protocol=TCP localport=8788
```

### 问题：页面空白或一直转圈

**原因：** JavaScript 执行错误

**解决：**
1. 清除浏览器缓存
2. 检查 F12 控制台错误
3. 重新构建前端：`pnpm run build`

### 问题：API 请求失败

**原因：** 数据库未初始化

**解决：**
```bash
pnpm exec wrangler d1 execute byteforge --local --file=./schema/d1.sql
```

## 📋 完整诊断清单

```powershell
# 运行完整诊断
Write-Host "1. 检查服务进程..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Select-Object Id, ProcessName, StartTime

Write-Host "`n2. 检查端口占用..." -ForegroundColor Yellow
netstat -ano | findstr :8788

Write-Host "`n3. 测试 API..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:8788/api/health"
    Write-Host "✓ API 正常: $($health.service)" -ForegroundColor Green
} catch {
    Write-Host "✗ API 无响应" -ForegroundColor Red
}

Write-Host "`n4. 测试页面..." -ForegroundColor Yellow
try {
    $page = Invoke-WebRequest -Uri "http://localhost:8788/login.html" -UseBasicParsing
    Write-Host "✓ 页面可访问 (状态码: $($page.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "✗ 页面无法访问" -ForegroundColor Red
}

Write-Host "`n5. 检查数据库..." -ForegroundColor Yellow
if (Test-Path ".wrangler\state\v3\d1") {
    Write-Host "✓ 数据库目录存在" -ForegroundColor Green
} else {
    Write-Host "✗ 数据库目录缺失" -ForegroundColor Red
}

Write-Host "`n6. 检查构建产物..." -ForegroundColor Yellow
if (Test-Path "dist\login.html") {
    Write-Host "✓ 前端已构建" -ForegroundColor Green
} else {
    Write-Host "✗ 前端未构建" -ForegroundColor Red
}
```

## 💡 当前建议

基于你的情况，建议：

1. **查看新打开的 PowerShell 窗口**
   - 应该有一个窗口显示 Wrangler 日志
   - 查看是否有错误信息

2. **如果没有看到窗口，手动启动：**
   ```
   双击 start-server.bat
   ```

3. **等待看到 "Ready on http://127.0.0.1:8788"**

4. **刷新浏览器（Ctrl+Shift+R）**

5. **如果还是加载中，按 F12 查看控制台错误**

---

**需要我帮你一步步诊断吗？**
