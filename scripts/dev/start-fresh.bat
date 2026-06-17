@echo off
echo ============================================
echo   ByteForge Development Server
echo ============================================
echo.

REM 先停止所有 Node 进程
echo [1/3] 停止旧服务...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul
echo       Done!
echo.

REM 删除旧数据库
echo [2/3] 清理数据库...
if exist ".wrangler\state\v3\d1" (
    rmdir /s /q ".wrangler\state\v3\d1"
)
timeout /t 1 /nobreak >nul
echo       Done!
echo.

REM 启动服务
echo [3/3] 启动 Wrangler...
echo ============================================
echo.
echo Server will be available at: http://localhost:8788
echo.
echo IMPORTANT: After you see "Ready on http://127.0.0.1:8788",
echo            press Ctrl+C to stop, then run:
echo            pnpm run db:init
echo            Then start again with: start-server.bat
echo.
echo ============================================
echo.

pnpm run dev:local
