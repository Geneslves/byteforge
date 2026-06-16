@echo off
REM ByteForge 完整开发环境启动脚本
REM 同时启动 Vite (前端) 和 Wrangler (API + 数据库)

echo.
echo ================================================
echo   ByteForge Development Environment
echo ================================================
echo.
echo Starting services...
echo   - Vite Dev Server (Frontend): http://localhost:5173
echo   - Wrangler API Server (Backend): http://localhost:8788
echo.
echo Press Ctrl+C to stop all services
echo ================================================
echo.

REM 构建静态文件
echo [1/3] Building static files...
call pnpm run build
if errorlevel 1 (
    echo Build failed!
    pause
    exit /b 1
)

REM 在新窗口启动 Vite
echo [2/3] Starting Vite frontend server...
start "ByteForge - Vite Frontend" cmd /k "pnpm run dev"

REM 等待 2 秒
timeout /t 2 /nobreak >nul

REM 在当前窗口启动 Wrangler (这样可以看到 API 日志)
echo [3/3] Starting Wrangler API server...
echo.
pnpm run dev:local
