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

# 開発サーバーの設定
ENV NODE_ENV=development
ENV HOSTNAME="0.0.0.0"
ENV PORT=5174

EXPOSE 5174

# 開発サーバーを起動（Next.jsの正しいコマンド）
CMD ["npm", "run", "dev"]