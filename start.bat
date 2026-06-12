@echo off
chcp 65001 >nul
echo ==========================================
echo   休闲游戏平台 - 一键启动脚本
echo ==========================================

set "ROOT_DIR=%~dp0"
set "BACKEND_DIR=%ROOT_DIR%backend"
set "FRONTEND_DIR=%ROOT_DIR%frontend"

echo 检查并安装后端依赖...
if not exist "%BACKEND_DIR%\node_modules" (
  cd /d "%BACKEND_DIR%" && npm install
)

echo 检查并安装前端依赖...
if not exist "%FRONTEND_DIR%\node_modules" (
  cd /d "%FRONTEND_DIR%" && npm install
)

echo 创建数据库目录...
if not exist "%BACKEND_DIR%\database" (
  mkdir "%BACKEND_DIR%\database"
)

echo 启动后端服务 (端口: 3000)...
start "后端服务" cmd /k "cd /d %BACKEND_DIR% && npm start"

timeout /t 2 /nobreak >nul

echo 启动前端服务 (端口: 5173)...
start "前端服务" cmd /k "cd /d %FRONTEND_DIR% && npm run dev"

echo.
echo ==========================================
echo   服务启动完成！
echo ==========================================
echo   后端服务: http://localhost:3000
echo   前端服务: http://localhost:5173
echo ==========================================
pause
