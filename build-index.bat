@echo off
chcp 65001 >nul 2>&1
cls
echo ============================================
echo   Local Search Engine - Build Index
echo ============================================
echo.

set /p INDEX_PATH="Enter directory path to index: "

if not exist "%INDEX_PATH%" (
    echo.
    echo ERROR: Directory not found
    pause
    exit /b 1
)

echo.
echo Building index...
echo.

cd /d "%~dp0"
node dist/cli/index.js build --db ./data/search-index.db -p "%INDEX_PATH%"

echo.
echo Index built successfully!
echo.
pause
