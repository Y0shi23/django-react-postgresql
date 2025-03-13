#!/bin/bash
set -e

echo "=== Dockerコンテナ内でフロントエンドの依存関係をインストールします ==="

# コンテナが実行中か確認
if ! docker ps | grep -q frontend; then
  echo "frontendコンテナが実行されていません。先にdocker-compose upを実行してください。"
  exit 1
fi

# コンテナ内でnpm installを実行
echo "コンテナ内でnpm installを実行しています..."
docker exec -it $(docker ps -q -f name=frontend) /bin/sh -c "cd /app && npm cache clean --force && rm -rf node_modules && npm install && npm install -g next"

# 権限を確認
echo "node_modulesの権限を確認しています..."
docker exec -it $(docker ps -q -f name=frontend) /bin/sh -c "ls -la /app/node_modules/.bin"

# Next.jsのバージョンを確認
echo "Next.jsのバージョンを確認しています..."
docker exec -it $(docker ps -q -f name=frontend) /bin/sh -c "next --version || echo 'Next.jsコマンドが見つかりません'"
docker exec -it $(docker ps -q -f name=frontend) /bin/sh -c "npm list next"

echo "=== インストールが完了しました ===" 