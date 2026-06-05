@echo off
echo ============================================
echo   Local Search Engine - Frontend Test Suite
echo ============================================
echo.

echo [1/4] Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js 18+ from https://nodejs.org/
    exit /b 1
)
echo Node.js version:
node --version
echo.

echo [2/4] Checking dependencies...
if not exist "node_modules" (
    echo Installing dependencies...
    npm ci
) else (
    echo Dependencies already installed
)
echo.

echo [3/4] Running tests with coverage...
npm run test:coverage
if errorlevel 1 (
    echo.
    echo ============================================
    echo   TESTS FAILED - Please check the errors above
    echo ============================================
    exit /b 1
)
echo.

echo [4/4] Generating test report...
echo Test report generated in coverage/ directory
echo.

echo ============================================
echo   All tests completed successfully!
echo ============================================
echo.
echo Coverage report: coverage/index.html
echo.
pause
