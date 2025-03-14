FROM node:latest

WORKDIR /app

# package.jsonとpackage-lock.jsonをコピー
COPY chatbot/package*.json ./

# 依存関係のインストール
RUN npm install

# グローバルにnext CLIをインストール
RUN npm install -g next

# ソースコードをコピー
COPY chatbot/ .

# ESLintチェックをスキップしてNext.jsアプリケーションをビルド
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_LINT_DISABLED=1
# basePath を設定
ENV NEXT_PUBLIC_BASE_PATH="/zxcvbnm"
RUN npm run build -- --no-lint

# 環境変数の設定
ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
ENV PORT=5174
# basePath を設定
ENV NEXT_PUBLIC_BASE_PATH="/zxcvbnm"
# トレイリングスラッシュを無効化
ENV NEXT_TRAILING_SLASH=false

EXPOSE 5174

# standaloneモードで正しく起動
CMD ["node", ".next/standalone/server.js"]