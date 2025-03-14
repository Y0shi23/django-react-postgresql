/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    // sePath: '/zxcvbnm', // 静的ファイルのパスを正しく生成するために必要
    // 404ページのフォールバック設定
    async rewrites() {
      return [
        {
          source: '/:path*',
          destination: '/:path*',
        },
      ];
    },
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