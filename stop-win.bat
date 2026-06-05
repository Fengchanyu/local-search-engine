@echo off
chcp 65001 >nul 2>&1
cls
echo ============================================
echo   Local Search Engine - Stop Services
echo ============================================
echo.

echo Stopping services...

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING 2^>nul') do (
    taskkill /PID %%a /F >nul 2>&1
    echo Stopped Frontend (Port 3000)
)

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3002 ^| findstr LISTENING 2^>nul') do (
    taskkill /PID %%a /F >nul 2>&1
    echo Stopped Backend (Port 3002)
)

echo.
echo All services stopped.
echo.
pause
