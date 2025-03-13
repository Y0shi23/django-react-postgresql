'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ServerSidebar from '@/components/ServerSidebar';
import { useSidebar } from '@/context/SidebarContext';

export default function ServersPage() {
  const { isSidebarOpen } = useSidebar();
  const router = useRouter();

  // ユーザーが認証されているか確認
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
    }
  }, [router]);

  return (
    <>
      <ServerSidebar />
      <div 
        className={`
          flex-1 transition-all duration-300
          ${isSidebarOpen ? 'ml-0 md:ml-64' : 'ml-0'}
        `}
      >
        <div className="h-[calc(100vh-4rem)] bg-gray-100 flex flex-col items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
            <h1 className="text-2xl font-bold mb-4">サーバーへようこそ</h1>
            <p className="text-gray-600 mb-6">
              左側のサイドバーからサーバーを選択するか、新しいサーバーを作成してください。
              サーバーが表示されない場合は、まだ参加しているサーバーがないかもしれません。
            </p>
            <div className="flex justify-center">
              <button
                onClick={() => document.getElementById('new-server-button')?.click()}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                新しいサーバーを作成
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 