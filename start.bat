@echo off
chcp 65001 >nul 2>&1
echo ===== FinTrack Startup =====
echo.
cd /d "%~dp0"

echo [1/2] Starting backend (port 10004)...
start "FinTrack-Server" /min cmd /k "cd /d %~dp0server && node src\index.js"
echo Waiting for server...

timeout /t 3 /nobreak >nul

echo [2/2] Starting frontend dev server (port 5173)...
start "FinTrack-Client" cmd /k "cd /d %~dp0client && npx vite"

timeout /t 4 /nobreak >nul
start "" http://localhost:5173

echo.
echo Backend:   http://localhost:10004
echo Frontend:  http://localhost:5173
echo.
pause
