/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    basePath: '/zxcvbnm',
    assetPrefix: '/zxcvbnm',
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
    // 静的ファイルの設定
    images: {
      unoptimized: true, // 画像の最適化を無効化
    },
    // 静的ファイルの処理を設定
    distDir: '.next',
    // publicディレクトリの設定
    publicRuntimeConfig: {
      basePath: '/zxcvbnm',
    },
    // 実行時の設定
    serverRuntimeConfig: {
      basePath: '/zxcvbnm',
    },
    // 静的ファイルの処理を設定
    poweredByHeader: false,
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