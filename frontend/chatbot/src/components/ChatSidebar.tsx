'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSidebar } from '@/context/SidebarContext';

interface Chat {
  id: string;
  title: string;
  lastMessageAt: string;
  messageCount: number;
}

export default function ChatSidebar() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pathname = usePathname();
  const currentChatId = pathname ? pathname.split('/').pop() : '';
  const { isSidebarOpen, closeSidebar } = useSidebar();

  useEffect(() => {
    const fetchChatHistory = async () => {
      try {
        const token = localStorage.getItem('token');
        
        // トークンが存在しない場合の処理
        if (!token) {
          console.error('認証トークンがありません。ログインしてください。');
          setIsLoading(false);
          setError('認証が必要です。ログインしてください。');
          return;
        }
        
        console.log('チャット履歴取得前のトークン:', token.substring(0, 10) + '...'); // セキュリティのため一部のみ表示
        
        const response = await fetch('http://localhost:3000/api/chats', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          credentials: 'include', // クッキーを含める
        });

        console.log('レスポンスステータス:', response.status);
        console.log('レスポンスヘッダー:', Object.fromEntries([...response.headers.entries()]));

        if (!response.ok) {
          // レスポンスの詳細情報を取得
          const errorText = await response.text();
          console.error('サーバーからのエラーレスポンス:', response.status, errorText);
          
          // 認証エラーの場合はトークンをクリアして再ログインを促す
          if (response.status === 401) {
            localStorage.removeItem('token');
            setError('認証の有効期限が切れました。再度ログインしてください。');
            return;
          }
          
          // エラーメッセージをより詳細に
          let errorMessage = 'チャット履歴の取得に失敗しました';
          try {
            const errorData = JSON.parse(errorText);
            if (errorData.error) {
              errorMessage = errorData.error;
            }
          } catch (e) {
            // JSONパースに失敗した場合は元のエラーメッセージを使用
          }
          
          throw new Error(errorMessage);
        }

        const data = await response.json();
        setChats(data.chats || []);
      } catch (error) {
        console.error('Error fetching chat history:', error);
        setChats([]); // エラー時は空の配列を設定
        
        // エラーメッセージをユーザーに表示
        setError(error instanceof Error ? error.message : 'チャット履歴の取得に失敗しました');
      } finally {
        setIsLoading(false);
      }
    };

    fetchChatHistory();
  }, []);

  // モバイル表示時にリンククリック後にサイドバーを閉じる
  const handleLinkClick = () => {
    if (window.innerWidth <= 768) {
      closeSidebar();
    }
  };

  return (
    <>
      <div 
        className={`
          bg-gray-800 text-white h-[calc(100vh-4rem)] fixed left-0 top-16 overflow-y-auto
          transition-all duration-300 z-40
          ${isSidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full md:translate-x-0'}
          md:w-64
        `}
      >
        <Link
          href="/chat"
          className="block w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-center"
          onClick={handleLinkClick}
        >
          新規チャット
        </Link>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 m-2 rounded">
            <p className="text-sm font-medium">{error}</p>
            <p className="text-xs mt-1">認証エラーが発生しました。再度ログインしてください。</p>
            <div className="mt-2 flex justify-center">
              <button 
                className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors duration-200 shadow-sm"
                onClick={() => window.location.href = '/login'}
              >
                ログインページへ
              </button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="text-center p-4">読み込み中...</div>
        ) : (
          <div className="space-y-1 mt-2">
            {!chats || chats.length === 0 ? (
              <div className="text-center p-4 text-gray-400">
                チャット履歴がありません
              </div>
            ) : (
              chats.map((chat) => (
                <Link
                  key={chat.id}
                  href={`/chat/${chat.id}`}
                  className={`block px-4 py-2 hover:bg-gray-700 ${
                    chat.id === currentChatId ? 'bg-gray-700' : ''
                  }`}
                  onClick={handleLinkClick}
                >
                  <div className="font-medium truncate">{chat.title}</div>
                  <div className="text-sm text-gray-400">
                    {new Date(chat.lastMessageAt).toLocaleDateString()}
                  </div>
                </Link>
              ))
            )}
          </div>
        )}
      </div>
      
      {/* モバイル表示時のオーバーレイ */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={closeSidebar}
        />
      )}
    </>
  );
} 