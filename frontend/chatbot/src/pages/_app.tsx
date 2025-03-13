import { useEffect } from 'react';
import type { AppProps } from 'next/app';
import { AuthProvider } from '@/context/AuthContext';
import { SidebarProvider } from '@/context/SidebarContext';
import '@/styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  // WebSocketサーバーの初期化
  useEffect(() => {
    const initSocket = async () => {
      try {
        // Socket.ioサーバーを初期化
        const response = await fetch('/api/socket');
        if (!response.ok) {
          console.error('Failed to initialize Socket.io server:', response.statusText);
        } else {
          console.log('Socket.io connection initialized successfully');
        }
      } catch (error) {
        console.error('Error initializing Socket.io connection:', error);
      }
    };

    // ページロード時に一度だけSocket.ioサーバーを初期化
    initSocket();

    // デバッグ情報
    console.log('App component mounted, WebSocket initialization triggered');
    
    // クリーンアップ関数
    return () => {
      console.log('App component unmounted');
    };
  }, []);

  return (
    <AuthProvider>
      <SidebarProvider>
        <Component {...pageProps} />
      </SidebarProvider>
    </AuthProvider>
  );
} 