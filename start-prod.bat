@echo off
cd /d "%~dp0server"

echo.
echo ============================================
echo   FinTrack - Production Mode
echo   http://localhost:10004
echo ============================================
echo.

set NODE_ENV=production
node src/index.js
pause
