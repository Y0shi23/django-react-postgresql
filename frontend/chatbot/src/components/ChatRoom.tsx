'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ChatSidebar from './ChatSidebar';
import { useSidebar } from '@/context/SidebarContext';
import { parseMessageContent } from '@/utils/messageParser';

// APIのベースURLを定義
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// パラメータの型定義
type ChatParams = {
  id?: string;
};

interface Message {
  id: string;
  chatId?: string;  // バックエンドのChatbotMessageと一致させるために追加
  content: string;
  role: string;
  timestamp: string | Date | { seconds: number; nanoseconds?: number };
}

export default function ChatRoom() {
  const params = useParams() as ChatParams;
  const chatId = params?.id;
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { isSidebarOpen } = useSidebar();

  // コンポーネントの初期化時にデバッグ情報を出力
  console.log('ChatRoomコンポーネントが初期化されました');
  console.log('API_URL:', API_URL);
  console.log('環境変数:', {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
    NEXT_PUBLIC_FRONTEND_URL: process.env.NEXT_PUBLIC_FRONTEND_URL,
  });

  useEffect(() => {
    console.log('ChatRoomコンポーネントがマウントされました');
    console.log('パラメータ:', params);
    console.log('チャットID:', chatId);
    
    if (chatId) {
      console.log(`チャットID ${chatId} のメッセージを取得します`);
      fetchMessages();
    } else {
      console.warn('チャットIDがありません。メッセージを取得できません。');
    }
  }, [chatId]);

  const fetchMessages = async () => {
    if (!chatId) {
      console.warn('チャットIDがありません。メッセージを取得できません。');
      return;
    }
    
    try {
      setLoading(true);
      const apiUrl = `${API_URL}/api/chats/${chatId}`;
      const token = localStorage.getItem('token');
      
      console.log(`チャットID ${chatId} のメッセージを取得中...`);
      console.log('APIリクエストURL:', apiUrl);
      console.log('認証トークン:', token ? `${token.substring(0, 10)}...` : 'なし');
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('レスポンスステータス:', response.status);
      console.log('レスポンスヘッダー:', Object.fromEntries([...response.headers.entries()]));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`メッセージ取得エラー: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`メッセージの取得に失敗しました: ${response.status} ${response.statusText}`);
      }
      
      // レスポンスの生データを確認
      const responseText = await response.text();
      console.log('メッセージ取得レスポンス（生テキスト）:', responseText);
      
      // 空のレスポンスの場合は早期リターン
      if (!responseText || responseText.trim() === '') {
        console.warn('レスポンスが空です');
        setMessages([]);
        return;
      }
      
      // JSONとしてパース
      let data = null;
      try {
        data = JSON.parse(responseText);
        console.log('メッセージ取得レスポンス（パース後）:', data);
        
        // データの構造を詳細に確認
        console.log('データ型:', typeof data);
        if (data === null) {
          console.error('データがnullです');
          setMessages([]);
          return;
        }
        
        console.log('データのキー:', Object.keys(data));
      } catch (e) {
        console.error('JSONパースエラー:', e);
        setMessages([]);
        return;
      }
      
      // データが存在するか確認
      if (!data) {
        console.error('データが存在しません');
        throw new Error('サーバーからの応答が空です');
      }
      
      console.log('データの型:', typeof data);
      console.log('データの内容:', JSON.stringify(data, null, 2));
      
      // データの形式に基づいて処理
      if (data && typeof data === 'object') {
        // messagesプロパティが存在する場合
        if (data.messages !== undefined && data.messages !== null) {
          console.log('messagesプロパティが存在します');
          
          // messagesが配列の場合
          if (Array.isArray(data.messages)) {
            console.log('messagesは配列です:', data.messages.length);
            
            // 各メッセージのタイムスタンプを文字列に変換
            const processedMessages = data.messages.map((msg: any) => ({
              ...msg,
              timestamp: typeof msg.timestamp === 'string' 
                ? msg.timestamp 
                : new Date(msg.timestamp).toISOString()
            }));
            
            console.log('処理後のメッセージ:', processedMessages);
            setMessages(processedMessages);
            return;
          }
          
          // messagesがオブジェクトの場合（キーバリューペア）
          if (typeof data.messages === 'object' && !Array.isArray(data.messages)) {
            console.log('messagesはオブジェクトです');
            const messagesArray = Object.values(data.messages).map((msg: any) => ({
              ...msg,
              timestamp: typeof msg.timestamp === 'string' 
                ? msg.timestamp 
                : new Date(msg.timestamp).toISOString()
            }));
            console.log('オブジェクトから配列に変換:', messagesArray);
            setMessages(messagesArray as Message[]);
            return;
          }
          
          console.warn('messagesの形式が不明です:', typeof data.messages);
          setMessages([]);
          return;
        }
        
        // データ自体が配列の場合
        if (Array.isArray(data)) {
          console.log('データ自体が配列です:', data.length);
          const processedMessages = data.map((msg: any) => ({
            ...msg,
            timestamp: typeof msg.timestamp === 'string' 
              ? msg.timestamp 
              : new Date(msg.timestamp).toISOString()
          }));
          setMessages(processedMessages);
          return;
        }
        
        // データ自体がメッセージオブジェクトの場合
        if ('id' in data && 'content' in data && 'role' in data) {
          console.log('データ自体がメッセージオブジェクトです');
          const processedMessage = {
            ...data,
            timestamp: typeof data.timestamp === 'string' 
              ? data.timestamp 
              : new Date(data.timestamp).toISOString()
          };
          setMessages([processedMessage as Message]);
          return;
        }
        
        // その他の場合
        console.warn('予期しないデータ形式です:', data);
        setMessages([]);
      } else {
        console.warn('データが不正な形式です:', data);
        setMessages([]);
      }
    } catch (error) {
      console.error('メッセージ取得エラー:', error);
      setError('メッセージの取得に失敗しました');
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !chatId) return;

    setLoading(true);
    setError('');

    // 送信前にユーザーメッセージを一時的に表示
    const tempUserMessage: Message = {
      id: `temp-${Date.now()}`,
      content: newMessage,
      role: 'user',
      timestamp: new Date().toISOString(),
    };
    
    setMessages(prev => [...prev, tempUserMessage]);
    const messageToSend = newMessage;
    setNewMessage('');

    try {
      const token = localStorage.getItem('token');
      const apiUrl = `${API_URL}/api/chats/${chatId}/messages`;
      
      console.log('メッセージ送信開始:', chatId, messageToSend);
      console.log('APIリクエストURL:', apiUrl);
      console.log('認証トークン:', token ? `${token.substring(0, 10)}...` : 'なし');
      console.log('リクエストボディ:', { message: messageToSend });
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ message: messageToSend }),
      });

      console.log('メッセージ送信レスポンスステータス:', response.status);
      console.log('レスポンスヘッダー:', Object.fromEntries([...response.headers.entries()]));
      
      if (!response.ok) {
        throw new Error('メッセージの送信に失敗しました');
      }

      // レスポンスの生データを確認
      const responseText = await response.text();
      console.log('メッセージ送信レスポンス（生テキスト）:', responseText);
      
      // 空のレスポンスの場合は早期リターン
      if (!responseText || responseText.trim() === '') {
        console.warn('レスポンスが空です');
        // 一時メッセージを削除して、サーバーからの応答で更新
        setTimeout(() => {
          fetchMessages();
        }, 500);
        return;
      }
      
      // JSONとしてパース
      let data = null;
      try {
        data = JSON.parse(responseText);
        console.log('メッセージ送信レスポンス（パース後）:', data);
        
        // データの構造を詳細に確認
        console.log('データ型:', typeof data);
        if (data === null) {
          console.error('データがnullです');
          throw new Error('サーバーからの応答が空です');
        }
        
        console.log('データのキー:', Object.keys(data));
      } catch (e) {
        console.error('JSONパースエラー:', e);
        throw new Error('レスポンスのJSONパースに失敗しました');
      }
      
      // データが存在するか確認
      if (!data) {
        console.error('データが存在しません');
        throw new Error('サーバーからの応答が空です');
      }
      
      console.log('データの型:', typeof data);
      console.log('データの内容:', JSON.stringify(data, null, 2));
      
      // サーバーからの応答を処理
      if (data.message !== undefined && data.message !== null) {
        console.log('サーバーからの応答メッセージ:', data.message);
        
        // メッセージオブジェクトの形式を確認
        const messageObj = data.message;
        if (typeof messageObj === 'object' && 'id' in messageObj && 'content' in messageObj && 'role' in messageObj) {
          // タイムスタンプを処理
          const processedMessage = {
            ...messageObj,
            timestamp: typeof messageObj.timestamp === 'string' 
              ? messageObj.timestamp 
              : new Date(messageObj.timestamp).toISOString()
          };
          
          // 既存のメッセージに新しいメッセージを追加
          setMessages(prevMessages => {
            // 一時メッセージを削除
            const filteredMessages = prevMessages.filter(msg => !msg.id.startsWith('temp-'));
            // 新しいメッセージを追加
            return [...filteredMessages, processedMessage as Message];
          });
          return;
        }
      } else if (data && typeof data === 'object') {
        // バックエンドから直接メッセージオブジェクトが返された場合
        console.log('サーバーからの応答（直接オブジェクト）:', data);
        
        // メッセージオブジェクトの形式を確認
        const hasRequiredFields = 'id' in data && 'content' in data && 'role' in data;
        
        if (hasRequiredFields) {
          // 必要なフィールドを持つオブジェクトの場合、メッセージとして処理
          setMessages(prevMessages => {
            // 一時メッセージを削除
            const filteredMessages = prevMessages.filter(msg => !msg.id.startsWith('temp-'));
            // 新しいメッセージを追加
            return [...filteredMessages, data as Message];
          });
          return;
        }
      }
      
      // 上記の条件に一致しない場合、全メッセージを再取得
      console.log('サーバーからの応答形式が予期しないため、全メッセージを再取得します');
      // 一時メッセージを削除して、サーバーからの応答で更新
      // 少し遅延を入れて、サーバー側の処理が完了するのを待つ
      setTimeout(() => {
        fetchMessages();
      }, 500);
    } catch (err) {
      // エラーの場合、一時メッセージを削除
      setMessages(prev => prev.filter(msg => msg.id !== tempUserMessage.id));
      setError(err instanceof Error ? err.message : '予期せぬエラーが発生しました');
      // 入力内容を復元
      setNewMessage(messageToSend);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('レンダリング時のメッセージ:', messages);
  }, [messages]);

  // タイムスタンプをフォーマットする関数
  const formatTimestamp = (timestamp: any): string => {
    try {
      if (!timestamp) return '';
      
      // 文字列の場合
      if (typeof timestamp === 'string') {
        return new Date(timestamp).toLocaleString();
      }
      
      // 数値（Unix タイムスタンプ）の場合
      if (typeof timestamp === 'number') {
        return new Date(timestamp).toLocaleString();
      }
      
      // オブジェクトの場合（Date オブジェクトなど）
      if (typeof timestamp === 'object') {
        // Date オブジェクトの場合
        if (timestamp instanceof Date) {
          return timestamp.toLocaleString();
        }
        
        // JSON から変換された日時オブジェクトの場合
        if ('seconds' in timestamp && typeof timestamp.seconds === 'number') {
          return new Date(timestamp.seconds * 1000).toLocaleString();
        }
      }
      
      // その他の場合は文字列に変換して表示
      return String(timestamp);
    } catch (error) {
      console.error('タイムスタンプのフォーマットエラー:', error, timestamp);
      return 'Invalid date';
    }
  };

  return (
    <>
      <ChatSidebar />
      <div 
        className={`
          flex-1 transition-all duration-300
          ${isSidebarOpen ? 'ml-0 md:ml-64' : 'ml-0'}
        `}
      >
        <div className="h-[calc(100vh-4rem)] bg-gray-100 flex flex-col overflow-hidden">
          <div className="flex-1 p-4 overflow-hidden">
            <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-4 h-full flex flex-col overflow-hidden">
              <div className="flex-1 space-y-4 overflow-y-auto mb-4 pt-2">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 mt-4">
                    メッセージがありません
                  </div>
                ) : (
                  <>
                    <div className="bg-yellow-100 p-2 rounded text-xs mb-2">
                      <p>デバッグ情報: メッセージ数 {messages.length}</p>
                      <pre className="overflow-auto max-h-20">
                        {JSON.stringify(messages, null, 2)}
                      </pre>
                    </div>
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`p-4 rounded-lg ${
                          message.role === 'user' 
                            ? 'bg-blue-100 ml-auto max-w-[80%]' 
                            : 'bg-gray-100 mr-auto max-w-[80%]'
                        }`}
                      >
                        <div className="text-gray-800">
                          {parseMessageContent(message.content)}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatTimestamp(message.timestamp)}
                        </p>
                      </div>
                    ))}
                  </>
                )}
                {isLoading && (
                  <div className="bg-gray-100 mr-auto max-w-[80%] p-4 rounded-lg">
                    <p className="text-gray-500">応答を生成中...</p>
                  </div>
                )}
              </div>

              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                <div className="rounded-lg overflow-hidden">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="メッセージを入力してください..."
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    disabled={isLoading}
                  />
                </div>
                <button
                  type="submit"
                  className={`w-full bg-blue-500 text-white py-2 px-4 rounded-lg
                    ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'}
                  `}
                  disabled={isLoading}
                >
                  {isLoading ? '送信中...' : '送信'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}