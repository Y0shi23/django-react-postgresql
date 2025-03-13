import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/hooks/useSocket';

interface Message {
  id?: string;
  channelId: string;
  message: string;
  sender: string;
  timestamp: string;
}

interface ChatMessagesProps {
  channelId: string | null;
}

const ChatMessages: React.FC<ChatMessagesProps> = ({ channelId }) => {
  const { user } = useAuth();
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ユーザー名がない場合はゲスト名を使用
  const username = user?.email?.split('@')[0] || 'Guest';

  // WebSocketフックを使用
  const {
    isConnected,
    messages,
    usersTyping,
    sendMessage,
    sendTypingNotification,
    connectionError,
    isInitialized,
  } = useSocket(channelId, username);

  // メッセージ送信処理
  const handleSendMessage = () => {
    if (!inputMessage.trim() || !channelId) return;
    
    sendMessage(inputMessage);
    setInputMessage('');
    
    // 送信後にフォーカスを入力欄に戻す
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // キー入力処理
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 入力中の通知処理
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputMessage(e.target.value);
    
    // タイピング通知を送信（スロットリング）
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    sendTypingNotification();
    
    typingTimeoutRef.current = setTimeout(() => {
      typingTimeoutRef.current = null;
    }, 2000);
  };

  // 新しいメッセージが来たら自動スクロール
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // チャンネルIDがない場合
  if (!channelId) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-gray-500">チャンネルを選択してください</p>
      </div>
    );
  }

  // 初期化中の表示
  if (!isInitialized) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="animate-pulse">
          <p className="text-gray-500">接続中...</p>
          <div className="mt-4 h-2 w-24 bg-gray-300 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* 接続状態表示 */}
      {!isConnected && (
        <div className="bg-yellow-500 text-white p-2 text-center">
          {connectionError ? (
            <p className="text-sm">{connectionError}</p>
          ) : (
            <p className="text-sm">サーバーに接続中... しばらくお待ちください</p>
          )}
        </div>
      )}

      {/* メッセージ表示エリア */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <p className="text-center text-gray-500">メッセージはまだありません</p>
        ) : (
          messages.map((msg: Message, index) => (
            <div
              key={msg.id || index}
              className={`flex ${
                msg.sender === username ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-xs md:max-w-md lg:max-w-lg rounded-lg px-4 py-2 ${
                  msg.sender === username
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-800'
                }`}
              >
                {msg.sender !== username && (
                  <div className="font-bold text-xs">{msg.sender}</div>
                )}
                <div>{msg.message}</div>
                <div className="text-xs opacity-70 text-right">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))
        )}
        {/* タイピング中の表示 */}
        {usersTyping.length > 0 && (
          <div className="text-gray-500 text-sm italic">
            {usersTyping.join(', ')}
            {usersTyping.length === 1 ? ' is ' : ' are '}
            typing...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 入力エリア */}
      <div className="border-t border-gray-300 p-4">
        <div className="flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={isConnected ? "メッセージを入力..." : "接続中..."}
            className="flex-1 border border-gray-300 rounded-l-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={!isConnected}
          />
          <button
            onClick={handleSendMessage}
            disabled={!isConnected || !inputMessage.trim()}
            className="bg-blue-600 text-white px-4 py-2 rounded-r-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400"
          >
            送信
          </button>
        </div>
        {!isConnected && !connectionError && (
          <p className="text-yellow-500 text-sm mt-1">
            サーバーに接続中... しばらくお待ちください
          </p>
        )}
      </div>
    </div>
  );
};

export default ChatMessages; 