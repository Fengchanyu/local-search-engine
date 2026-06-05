@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul 2>&1
cls

echo ============================================
echo   Local Search Engine - Launcher
echo ============================================
echo.

echo [1/5] Checking Node.js environment...

set "NODE_PATH="
set "NPM_PATH="

where node >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('node -v 2^>^&1') do set NODE_VERSION=%%i
    echo [SUCCESS] Detected Node.js %NODE_VERSION%
    goto check_npm
)

if exist "C:\Program Files\nodejs\node.exe" (
    set "NODE_PATH=C:\Program Files\nodejs\node.exe"
    set "PATH=C:\Program Files\nodejs;%PATH%"
    for /f "tokens=*" %%i in ('"%NODE_PATH%" -v 2^>^&1') do set NODE_VERSION=%%i
    echo [SUCCESS] Detected Node.js %NODE_VERSION% at: %NODE_PATH%
    echo [INFO] Node.js found but not in PATH. Added to PATH.
    goto check_npm
)

echo.
echo [ERROR] Node.js not detected
echo.
echo Node.js is required to run this application.
echo.
echo Please choose an option:
echo   1. Auto-download and install Node.js
echo   2. Show manual installation guide
echo   3. Exit
echo.
set /p choice="Enter option (1/2/3): "

if "!choice!"=="1" goto install_node
if "!choice!"=="2" goto show_manual
goto :eof

:install_node
echo.
echo [INSTALL] Preparing to install Node.js...
echo.
powershell -ExecutionPolicy Bypass -File "%~dp0scripts\install-node.ps1"
if %errorlevel% equ 0 (
    echo.
    echo [SUCCESS] Node.js installation complete!
    echo [INFO] Please close this window and restart the launcher.
    pause
) else (
    echo.
    echo [FAILED] Auto-installation failed, please choose manual installation
    goto show_manual
)
goto :eof

:show_manual
echo.
echo ============================================
echo   Manual Node.js Installation
echo ============================================
echo.
echo Method 1: Official Website (Recommended)
echo   1. Visit: https://nodejs.org/
echo   2. Download the LTS version
echo   3. Run the installer
echo.
echo Method 2: Package Manager
echo   - Chocolatey: choco install nodejs
echo   - Scoop: scoop install nodejs
echo.
echo After installation, please restart this launcher.
echo.
pause
goto :eof

:check_npm
where npm >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('npm -v 2^>^&1') do set NPM_VERSION=%%i
    echo [SUCCESS] Detected npm %NPM_VERSION%
    echo.
    goto check_dependencies
)

if exist "C:\Program Files\nodejs\npm.cmd" (
    set "NPM_PATH=C:\Program Files\nodejs\npm.cmd"
    for /f "tokens=*" %%i in ('"%NPM_PATH%" -v 2^>^&1') do set NPM_VERSION=%%i
    echo [SUCCESS] Detected npm %NPM_VERSION%
    echo.
    goto check_dependencies
)

echo [ERROR] npm not found. Please reinstall Node.js.
pause
goto :eof

:check_dependencies
echo [2/5] Checking project dependencies...
echo.

set "NEED_INSTALL=0"

if not exist "%~dp0node_modules" (
    echo [INFO] Root node_modules not found
    set "NEED_INSTALL=1"
) else (
    echo [SUCCESS] Root dependencies found
)

if not exist "%~dp0web\node_modules" (
    echo [INFO] Web node_modules not found
    set "NEED_INSTALL=1"
) else (
    echo [SUCCESS] Web dependencies found
)

if "%NEED_INSTALL%"=="1" (
    echo.
    echo [INFO] Some dependencies are missing. Installing...
    echo.
    
    echo [INSTALL] Installing root dependencies...
    echo.
    if defined NPM_PATH (
        call "%NPM_PATH%" install --prefix "%~dp0"
    ) else (
        call npm install
    )
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install root dependencies
        pause
        goto :eof
    )
    echo [SUCCESS] Root dependencies installed
    echo.
    
    echo [INSTALL] Installing web dependencies...
    echo.
    pushd "%~dp0web"
    if defined NPM_PATH (
        call "%NPM_PATH%" install
    ) else (
        call npm install
    )
    popd
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install web dependencies
        pause
        goto :eof
    )
    echo [SUCCESS] Web dependencies installed
    echo.
)

:check_build
echo [3/5] Checking project build...
echo.

set "NEED_BUILD=0"

if not exist "%~dp0dist" (
    echo [INFO] dist directory not found
    set "NEED_BUILD=1"
) else (
    if not exist "%~dp0dist\cli\index.js" (
        echo [INFO] dist/cli/index.js not found
        set "NEED_BUILD=1"
    ) else (
        echo [SUCCESS] Backend build found
    )
)

if not exist "%~dp0web\dist" (
    echo [INFO] web/dist directory not found
    set "NEED_BUILD=1"
) else (
    echo [SUCCESS] Frontend build found
)

if "%NEED_BUILD%"=="1" (
    echo.
    echo [INFO] Project needs to be built. Building...
    echo.
    
    echo [BUILD] Building backend...
    echo.
    if defined NPM_PATH (
        call "%NPM_PATH%" run build
    ) else (
        call npm run build
    )
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to build backend
        pause
        goto :eof
    )
    echo [SUCCESS] Backend built successfully
    echo.
    
    echo [BUILD] Building frontend...
    echo.
    pushd "%~dp0web"
    if defined NPM_PATH (
        call "%NPM_PATH%" run build
    ) else (
        call npm run build
    )
    popd
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to build frontend
        pause
        goto :eof
    )
    echo [SUCCESS] Frontend built successfully
    echo.
)

:check_index
echo [4/5] Checking index configuration...
echo.

set "INDEX_PATH="
set "SKIP_INDEX="

if not "%~1"=="" (
    set "INDEX_PATH=%~1"
    echo [INFO] Index path provided: %INDEX_PATH%
    goto start_app
)

echo No index path specified.
echo.
echo Please choose an option:
echo   1. Index current directory
echo   2. Index user Documents folder
echo   3. Index user Desktop
echo   4. Specify custom path
echo   5. Skip indexing (not recommended)
echo.
set /p index_choice="Enter option (1/2/3/4/5): "

if "!index_choice!"=="1" (
    set "INDEX_PATH=%~dp0"
    :: Remove trailing backslash
    if "!INDEX_PATH:~-1!"=="\" set "INDEX_PATH=!INDEX_PATH:~0,-1!"
    echo [INFO] Will index: !INDEX_PATH!
    goto start_app
)

if "!index_choice!"=="2" (
    set "INDEX_PATH=%USERPROFILE%\Documents"
    echo [INFO] Will index: !INDEX_PATH!
    goto start_app
)

if "!index_choice!"=="3" (
    set "INDEX_PATH=%USERPROFILE%\Desktop"
    echo [INFO] Will index: !INDEX_PATH!
    goto start_app
)

if "!index_choice!"=="4" (
    echo.
    set /p custom_path="Enter directory path to index: "
    if exist "!custom_path!" (
        set "INDEX_PATH=!custom_path!"
        echo [INFO] Will index: !INDEX_PATH!
        goto start_app
    ) else (
        echo [ERROR] Directory not found: !custom_path!
        pause
        goto :eof
    )
)

if "!index_choice!"=="5" (
    echo [INFO] Skipping index build...
    set "SKIP_INDEX=1"
    goto start_app
)

echo [ERROR] Invalid option
pause
goto :eof

:start_app
echo.
echo [5/5] Starting application...
echo.

:: Remove trailing backslash from INDEX_PATH if present
if defined INDEX_PATH (
    if "!INDEX_PATH:~-1!"=="\" set "INDEX_PATH=!INDEX_PATH:~0,-1!"
)

if defined SKIP_INDEX (
    if defined NODE_PATH (
        "%NODE_PATH%" "%~dp0scripts\start.js" --open-browser --skip-index %*
    ) else (
        node "%~dp0scripts\start.js" --open-browser --skip-index %*
    )
) else if defined INDEX_PATH (
    if not "!INDEX_PATH!"=="" (
        echo [INFO] Building index for: !INDEX_PATH!
        echo.
        if defined NODE_PATH (
            "%NODE_PATH%" "%~dp0scripts\start.js" --open-browser --index-path="!INDEX_PATH!" %*
        ) else (
            node "%~dp0scripts\start.js" --open-browser --index-path="!INDEX_PATH!" %*
        )
    ) else (
        if defined NODE_PATH (
            "%NODE_PATH%" "%~dp0scripts\start.js" --open-browser --skip-index %*
        ) else (
            node "%~dp0scripts\start.js" --open-browser --skip-index %*
        )
    )
) else (
    if defined NODE_PATH (
        "%NODE_PATH%" "%~dp0scripts\start.js" --open-browser --skip-index %*
    ) else (
        node "%~dp0scripts\start.js" --open-browser --skip-index %*
    )
)
