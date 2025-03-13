'use client';

import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-center mb-4">ようこそ</h1>
        <p className="text-center text-gray-600">
          ログインまたは新規登録してください。
        </p>
      </div>
    </div>
  );
}
