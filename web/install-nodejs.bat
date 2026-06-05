@echo off
echo ============================================
echo   Node.js 环境检查与安装指南
echo ============================================
echo.

echo [当前状态]
echo 系统中未找到 Node.js 18+ 版本
echo Vite 5 需要 Node.js 18.0.0 或更高版本
echo.

echo [解决方案]
echo.
echo 方案一：直接安装 Node.js LTS
echo ----------------------------------------
echo 1. 访问 https://nodejs.org/
echo 2. 下载 LTS (长期支持) 版本
echo 3. 运行安装程序，使用默认设置
echo 4. 重启命令行窗口
echo 5. 运行: node --version 确认安装成功
echo.

echo 方案二：使用 nvm-windows 管理多版本
echo ----------------------------------------
echo 1. 访问 https://github.com/coreybutler/nvm-windows/releases
echo 2. 下载 nvm-setup.exe 并安装
echo 3. 运行以下命令:
echo    nvm install 20
echo    nvm use 20
echo 4. 运行: node --version 确认版本
echo.

echo 方案三：使用 winget 安装 (Windows 11)
echo ----------------------------------------
echo 1. 以管理员身份打开 PowerShell
echo 2. 运行: winget install OpenJS.NodeJS.LTS
echo 3. 重启命令行窗口
echo 4. 运行: node --version 确认安装成功
echo.

echo ============================================
echo   安装完成后请运行 start-dev.bat
echo ============================================
echo.
pause
