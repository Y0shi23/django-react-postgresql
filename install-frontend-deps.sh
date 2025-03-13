#!/bin/bash
set -e

echo "=== フロントエンドの依存関係インストールを開始します ==="

# フロントエンドのディレクトリに移動
cd frontend/chatbot

# package-lock.jsonが存在する場合は削除
if [ -f package-lock.json ]; then
  echo "package-lock.jsonを削除しています..."
  rm package-lock.json
fi

# node_modulesが存在する場合は削除
if [ -d node_modules ]; then
  echo "node_modulesを削除しています..."
  rm -rf node_modules
fi

# npmキャッシュをクリア
echo "npmキャッシュをクリアしています..."
npm cache clean --force

# 依存関係をクリーンインストール
echo "依存関係をインストールしています..."
npm install --no-package-lock

echo "=== 依存関係のインストールが完了しました ==="
echo "インストールされたパッケージ:"
npm list --depth=0 