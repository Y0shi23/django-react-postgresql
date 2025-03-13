# Chatbot Frontend

## 環境構築

### 必要なパッケージのインストール

```bash
npm install
# または
yarn install
```

### 環境変数の設定

`.env.local`ファイルを作成し、以下の内容を設定します：

```
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000
NEXT_PUBLIC_FRONTEND_URL=http://localhost:5173
```

## 開発サーバーの起動

### カスタムサーバー（WebSocket対応）で起動

```bash
npm run dev
# または
yarn dev
```

### Next.jsの標準サーバーで起動（WebSocketなし）

```bash
npm run dev:next
# または
yarn dev:next
```

## ビルドと本番環境での実行

### ビルド

```bash
npm run build
# または
yarn build
```

### 本番環境での実行

```bash
npm run start
# または
yarn start
```

## トラブルシューティング

### ポートの競合

フロントエンドは5173番ポート、バックエンドは3000番ポートを使用しています。
ポートを変更する場合は、`.env.local`ファイルと`server.js`ファイルを修正してください。

### WebSocketの接続エラー

WebSocketの接続エラーが発生する場合は、以下を確認してください：

1. バックエンドが起動しているか
2. `.env.local`ファイルのバックエンドURLが正しいか
3. CORSの設定が正しいか

### 依存関係のエラー

依存関係のエラーが発生する場合は、以下のコマンドを実行してください：

```bash
npm install --force
# または
yarn install --force
```

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
