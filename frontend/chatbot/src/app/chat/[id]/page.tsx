'use client';

import { useAuth } from '@/context/AuthContext';
import ChatRoom from '@/components/ChatRoom';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ChatPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex">
      <ChatRoom />
    </div>
  );
} 