@echo off
chcp 65001 >nul
echo ================================
echo    歌词管理系统 - Windows 部署
echo ================================
echo.

REM 进入脚本所在目录
cd /d "%~dp0"

REM 加载配置文件
if exist "config.conf" (
    echo 📋 加载配置文件...
    for /f "tokens=1,2 delims==" %%a in (config.conf) do (
        if "%%a"=="PORT" set PORT=%%b
        if "%%a"=="ADMIN_PASSWORD" set ADMIN_PASSWORD=%%b
        if "%%a"=="NODE_ENV" set NODE_ENV=%%b
    )
) else (
    echo ⚠️  配置文件 config.conf 不存在，使用默认配置
    set PORT=3000
    set ADMIN_PASSWORD=admin
    set NODE_ENV=development
)

echo.
echo 🔧 当前配置:
echo    - 端口: %PORT%
echo    - 密码: %ADMIN_PASSWORD%
echo    - 环境: %NODE_ENV%
echo.

echo 📦 检查依赖...
if not exist "node_modules" (
    echo 安装依赖包...
    npm install
    if errorlevel 1 (
        echo ❌ 依赖安装失败
        pause
        exit /b 1
    )
)

echo ✅ 依赖检查完成
echo.
echo 🚀 启动服务器...
echo 🌐 访问地址: http://localhost:%PORT%
echo 🔑 默认密码: %ADMIN_PASSWORD%
echo.

npm start

echo.
echo 服务器已停止运行
pause
