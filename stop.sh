#!/bin/bash

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$ROOT_DIR/pids.txt"

if [ -f "$PID_FILE" ]; then
  PIDS=$(cat "$PID_FILE")
  for PID in $PIDS; do
    if kill -0 $PID 2>/dev/null; then
      kill $PID 2>/dev/null
      echo "已停止进程 PID: $PID"
    fi
  done
  rm -f "$PID_FILE"
else
  echo "未找到运行中的服务"
fi

pkill -f "node server.js" 2>/dev/null
pkill -f "vite" 2>/dev/null

echo "所有服务已停止"
