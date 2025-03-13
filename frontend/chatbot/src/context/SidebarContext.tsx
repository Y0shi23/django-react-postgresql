'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface SidebarContextType {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
  // サーバーサイドレンダリング時はデフォルト値を使用し、クライアントサイドでのみウィンドウサイズに基づいて更新
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // クライアントサイドでのみ実行されるuseEffect
  useEffect(() => {
    setIsClient(true);
    
    // 初期状態の設定: 768px以下の場合はサイドバーを閉じる、それ以外は開く
    const initialState = window.innerWidth > 768;
    setIsSidebarOpen(initialState);
    
    // ウィンドウサイズの変更を監視
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };

    // コンポーネントマウント時にイベントリスナーを追加
    window.addEventListener('resize', handleResize);

    // クリーンアップ関数
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <SidebarContext.Provider value={{ isSidebarOpen, toggleSidebar, closeSidebar }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
} 