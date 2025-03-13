import React, { ReactNode } from 'react';
import { useSidebar } from '@/context/SidebarContext';
import ServerSidebar from './ServerSidebar';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { isSidebarOpen } = useSidebar();

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* サイドバー */}
      <div
        className={`fixed md:static top-16 left-0 h-[calc(100vh-4rem)] bg-gray-800 transition-all duration-300 z-40 ${
          isSidebarOpen ? 'w-64' : 'w-0 md:w-64 -translate-x-full md:translate-x-0'
        }`}
      >
        <ServerSidebar />
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
};

export default Layout; 