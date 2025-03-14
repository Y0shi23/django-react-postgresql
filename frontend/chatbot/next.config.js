/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    basePath: '/zxcvbnm', // 先頭にスラッシュを追加
    assetPrefix: process.env.NODE_ENV === 'production' ? '/zxcvbnm' : '', // アセットプレフィックスのみ設定
    // 404ページのフォールバック設定
    async rewrites() {
      return [
        // 他のパスのリダイレクト
        {
          source: '/:path*',
          destination: '/:path*',
        },
      ];
    },
    // トレイリングスラッシュの設定
    trailingSlash: false, // トレイリングスラッシュを無効化
    experimental: {
      // appDirは最新のNext.jsでは不要
    },
    // 開発サーバーの設定
    webpack: (config, { isServer, dev }) => {
      if (dev && !isServer) {
        // クライアント側の開発時の設定
        config.watchOptions = {
          poll: 1000,
          aggregateTimeout: 300,
        };
      }
      return config;
    },
  }
  
  module.exports = nextConfig 