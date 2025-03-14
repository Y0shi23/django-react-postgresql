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
ENV NEXT_ASSET_PREFIX="/zxcvbnm"
RUN npm run build -- --no-lint

# 環境変数の設定
ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
ENV PORT=5174
# basePath を設定
ENV NEXT_PUBLIC_BASE_PATH="/zxcvbnm"
ENV NEXT_ASSET_PREFIX="/zxcvbnm"
# トレイリングスラッシュを無効化
ENV NEXT_TRAILING_SLASH=false

# 静的ファイルをコピー
RUN mkdir -p /app/.next/standalone/public
RUN cp -R /app/public/* /app/.next/standalone/public/
RUN cp -R /app/.next/static /app/.next/standalone/.next/

# 静的ファイルの権限を設定
RUN chmod -R 755 /app/.next/standalone/public
RUN chmod -R 755 /app/.next/standalone/.next/static

EXPOSE 5174

# standaloneモードで正しく起動
CMD ["node", ".next/standalone/server.js"]