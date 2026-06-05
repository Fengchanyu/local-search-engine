@echo off
echo ============================================
echo   Local Search Engine - Frontend Dev Server
echo ============================================
echo.

echo Checking Node.js version...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed
    echo Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo Node.js version: %NODE_VERSION%

echo.
echo Starting development server...
echo.

cd /d "%~dp0"
node ./node_modules/vite/bin/vite.js --host

pause
