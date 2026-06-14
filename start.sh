#!/bin/bash

echo "=========================================="
echo "  休闲游戏平台 - 一键启动脚本"
echo "=========================================="

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

echo "检查并安装后端依赖..."
if [ ! -d "$BACKEND_DIR/node_modules" ]; then
  cd "$BACKEND_DIR" && npm install
fi

echo "检查并安装前端依赖..."
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
  cd "$FRONTEND_DIR" && npm install
fi

echo "创建数据库目录..."
mkdir -p "$BACKEND_DIR/database"

echo "启动后端服务 (端口: 3084)..."
cd "$BACKEND_DIR" && nohup npm start > backend.log 2>&1 &
BACKEND_PID=$!
echo "后端服务已启动，PID: $BACKEND_PID"

sleep 2

echo "启动前端服务 (端口: 5184)..."
cd "$FRONTEND_DIR" && nohup npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!
echo "前端服务已启动，PID: $FRONTEND_PID"

echo ""
echo "=========================================="
echo "  服务启动完成！"
echo "=========================================="
echo "  后端服务: http://localhost:3084"
echo "  前端服务: http://localhost:5184"
echo "  手机访问: http://\$(hostname -I | cut -d' ' -f1):5184"
echo ""
echo "  停止服务: ./stop.sh"
echo "  查看后端日志: tail -f $BACKEND_DIR/backend.log"
echo "  查看前端日志: tail -f $FRONTEND_DIR/frontend.log"
echo "=========================================="

echo "$BACKEND_PID $FRONTEND_PID" > "$ROOT_DIR/pids.txt"
