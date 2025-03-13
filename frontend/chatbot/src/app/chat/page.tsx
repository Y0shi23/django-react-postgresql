'use client';

import { useAuth } from '@/context/AuthContext';
import NewChatForm from '@/components/NewChatForm';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function ChatPage() {
  const { isAuthenticated, isLoading: authLoading, token, user } = useAuth();
  const router = useRouter();
  const [isPageReady, setIsPageReady] = useState(false);

  useEffect(() => {
    // 認証状態が確定したら準備完了とする
    if (!authLoading) {
      setIsPageReady(true);
    }
    
    // 認証されていない場合はログインページにリダイレクト
    if (!authLoading && !isAuthenticated) {
      console.log('Not authenticated, redirecting to login page');
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  // ローディング中は読み込み中の表示
  if (authLoading || !isPageReady) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  // 認証されていない場合は何も表示しない（リダイレクト中）
  if (!isAuthenticated) {
    return null;
  }

  // トークンがあるが、ユーザー情報がない場合の表示
  if (!user) {
    return (
      <div className="flex flex-col min-h-screen">
        <div className="flex-1 p-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white shadow-md rounded-lg p-6">
              <h1 className="text-2xl font-bold mb-4">チャット</h1>
              <p className="mb-4">ユーザー情報を取得中...</p>
              <p className="text-sm text-gray-500">認証は完了していますが、ユーザー情報の取得に問題があります。</p>
              <p className="text-sm text-gray-500">このまま続けることができます。</p>
            </div>
            <NewChatForm />
          </div>
        </div>
      </div>
    );
  }

  // 通常の表示（認証済み＆ユーザー情報あり）
  return (
    <div className="flex">
      <NewChatForm />
    </div>
  );
} 