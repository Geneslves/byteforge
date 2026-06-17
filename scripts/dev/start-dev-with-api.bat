@echo off
echo Starting ByteForge Dev Server with API Functions...
echo.
echo Server will start on http://localhost:8788
echo API endpoints will be available at http://localhost:8788/api/*
echo.
cd /d E:\Code\byteforge
call pnpm run dev:local
