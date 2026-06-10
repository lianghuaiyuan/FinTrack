@echo off
chcp 65001 >nul 2>&1
echo ===== FinTrack Setup =====
echo.

REM Check Node.js (version 16+)
echo [1/4] Checking Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found. Please install Node.js 16 or later.
    echo Download: https://nodejs.org/
    pause
    exit /b 1
)
node --version

REM Check npm
echo [2/4] Checking npm...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: npm not found.
    pause
    exit /b 1
)
npm --version

REM Install server dependencies
echo [3/4] Installing server dependencies...
cd /d "%~dp0server"
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Server dependency install failed.
    pause
    exit /b 1
)
echo Server dependencies installed.

REM Install client dependencies
echo [4/4] Installing client dependencies...
cd /d "%~dp0client"
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Client dependency install failed.
    pause
    exit /b 1
)
echo Client dependencies installed.

REM Copy .env if missing
cd /d "%~dp0"
if not exist .env (
    copy .env.example .env >nul
    echo.
    echo NOTE: .env created from .env.example.
)

echo.
echo ===== Setup complete! Run start.bat =====
pause
