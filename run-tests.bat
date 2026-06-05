@echo off
chcp 65001 >nul 2>&1
cls
echo ============================================
echo   Local Search Engine - Run Tests
echo ============================================
echo.

echo [1/2] Checking Node.js...
where node >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js not found
    pause
    exit /b 1
)

echo [2/2] Running tests...
echo.

cd /d "%~dp0web"
node ./node_modules/vitest/vitest.mjs --run --reporter=basic

echo.
pause
