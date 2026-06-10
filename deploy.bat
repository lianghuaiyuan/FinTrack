@echo off
cd /d "%~dp0"

echo ===== FinTrack Deploy =====
echo.

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found. Install from https://nodejs.org
    pause
    exit /b 1
)

echo [1/3] Installing server dependencies...
cd /d "%~dp0server"
call npm install --omit=dev
if %errorlevel% neq 0 (
    echo ERROR: Server dependency install failed.
    pause
    exit /b 1
)

echo.
echo [2/3] Installing client dependencies...
cd /d "%~dp0client"
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Client dependency install failed.
    pause
    exit /b 1
)

echo.
echo [3/3] Building frontend...
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Build failed.
    pause
    exit /b 1
)

echo.
echo ===== Deploy complete! =====
echo Run start-prod.bat to start.
pause
