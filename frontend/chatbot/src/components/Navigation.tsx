'use client';

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useSidebar } from '@/context/SidebarContext'

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const { toggleSidebar } = useSidebar();
  
  const handleLogout = () => {
    logout();
    router.push('/');
  };

  // パスがnullの場合は空文字列を使用
  const path = pathname || '';
  
  // チャット関連のページかどうかを判定
  const isChatPage = path.startsWith('/chat');
  // サーバー/チャンネル関連のページかどうかを判定
  const isServerPage = path.startsWith('/channels');
  // サイドバーを表示するページかどうか
  const showSidebar = isChatPage || isServerPage;
  
  return (
    <nav className="bg-gray-800 text-white h-16 fixed top-0 w-full z-50">
      <div className="h-full px-4 flex justify-between items-center">
        <div className="flex items-center">
          {showSidebar && (
            <button
              onClick={toggleSidebar}
              className="mr-3 md:hidden"
              aria-label="Toggle sidebar"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          )}
          <Link href="/" className="text-xl font-bold">
            ChatBot
          </Link>
        </div>
        <div className="flex items-center gap-4">          
          {isAuthenticated ? (
            <div className="flex items-center gap-4">
              <Link 
                href="/chat" 
                className={`px-3 py-1 rounded text-white text-sm ${
                  isChatPage ? 'bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                チャット
              </Link>
              <Link 
                href="/channels" 
                className={`px-3 py-1 rounded text-white text-sm ${
                  isServerPage ? 'bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                サーバー
              </Link>
              <span className="text-sm text-gray-300 hidden sm:inline">
                こんにちは、{user?.username}さん
              </span>
              <button 
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-white text-sm"
              >
                ログアウト
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Link 
                href="/login" 
                className={`bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-white text-sm ${
                  path === '/login' ? 'bg-blue-700' : ''
                }`}
              >
                ログイン
              </Link>
              <Link 
                href="/register" 
                className={`bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-white text-sm ${
                  path === '/register' ? 'bg-green-700' : ''
                }`}
              >
                新規登録
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
} 