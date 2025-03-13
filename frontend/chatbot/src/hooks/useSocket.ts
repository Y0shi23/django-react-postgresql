import { useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

// メッセージの型定義
interface Message {
  id?: string;  // メッセージの一意のID（オプション）
  channelId: string;
  message: string;
  sender: string;
  timestamp: string;
}

// タイピング通知の型定義
interface TypingNotification {
  username: string;
}

// エラーオブジェクトの型定義
interface SocketError {
  message: string;
}

// WebSocketクライアントを使用するためのカスタムフック
export const useSocket = (channelId: string | null, username: string) => {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [usersTyping, setUsersTyping] = useState<string[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // WebSocketクライアントの初期化
  useEffect(() => {
    // 既存の接続がある場合はクリーンアップ
    if (socketRef.current) {
      console.log('Cleaning up existing socket connection');
      socketRef.current.disconnect();
    }

    // 接続エラーをリセット
    setConnectionError(null);
    
    // 初期化中の状態を設定
    setIsInitialized(false);

    let socket: Socket;

    try {
      console.log('Initializing new socket connection');
      
      // バックエンドのURLを環境変数から取得（デフォルトはlocalhost:3000）
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';
      console.log('Using backend URL:', backendUrl);
      
      // 新しい接続を作成
      socket = io(backendUrl, {
        path: '/socket.io',
        addTrailingSlash: false,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        autoConnect: true,
        transports: ['websocket', 'polling'],
      });

      // 接続イベントのハンドラー
      socket.on('connect', () => {
        console.log('Connected to WebSocket server with ID:', socket.id);
        setIsConnected(true);
        setConnectionError(null);
        setIsInitialized(true);

        // チャンネルIDがある場合はそのチャンネルに参加
        if (channelId) {
          console.log(`Joining channel: ${channelId}`);
          socket.emit('joinChannel', channelId);
          
          // チャンネルの過去メッセージを取得（サーバー側で実装されている場合）
          socket.emit('getChannelHistory', { channelId });
        }
      });

      // 接続エラーのハンドラー
      socket.on('connect_error', (error: SocketError) => {
        console.error('Connection error:', error);
        setConnectionError(`接続エラー: ${error.message}`);
        setIsConnected(false);
        setIsInitialized(true); // エラーでも初期化は完了したとみなす
      });

      // 切断イベントのハンドラー
      socket.on('disconnect', (reason: string) => {
        console.log(`Disconnected from WebSocket server: ${reason}`);
        setIsConnected(false);
        
        if (reason === 'io server disconnect') {
          // サーバーが切断を強制した場合は再接続を試みる
          socket.connect();
        }
      });

      // 再接続イベントのハンドラー
      socket.on('reconnect', (attemptNumber: number) => {
        console.log(`Reconnected after ${attemptNumber} attempts`);
        setIsConnected(true);
        setConnectionError(null);
        
        // 再接続後にチャンネルに再参加
        if (channelId) {
          socket.emit('joinChannel', channelId);
        }
      });

      // 再接続試行のハンドラー
      socket.on('reconnect_attempt', (attemptNumber: number) => {
        console.log(`Reconnection attempt: ${attemptNumber}`);
      });

      // 再接続エラーのハンドラー
      socket.on('reconnect_error', (error: SocketError) => {
        console.error('Reconnection error:', error);
        setConnectionError(`再接続エラー: ${error.message}`);
      });

      // 再接続失敗のハンドラー
      socket.on('reconnect_failed', () => {
        console.error('Failed to reconnect');
        setConnectionError('再接続に失敗しました。ページを更新してください。');
      });

      // チャンネル履歴を受信したときのハンドラー
      socket.on('channelHistory', (history: Message[]) => {
        console.log('Received channel history:', history);
        setMessages(history || []);
      });

      // 新しいメッセージを受信したときのハンドラー
      socket.on('newMessage', (message: Message) => {
        console.log('New message received:', message);
        // 重複を避けるために、既存のメッセージと比較して追加
        setMessages((prev) => {
          // メッセージIDがある場合は重複チェック（サーバー側で実装されている場合）
          if (message.id) {
            const exists = prev.some(m => (m as any).id === message.id);
            if (exists) return prev;
          }
          return [...prev, message];
        });
      });

      // ユーザーがタイピング中の通知を受信したときのハンドラー
      socket.on('userTyping', ({ username }: TypingNotification) => {
        console.log(`${username} is typing...`);
        setUsersTyping((prev) => {
          if (!prev.includes(username)) {
            return [...prev, username];
          }
          return prev;
        });

        // タイピング通知を3秒後に削除
        setTimeout(() => {
          setUsersTyping((prev) => prev.filter((user) => user !== username));
        }, 3000);
      });

      // socketRefに保存
      socketRef.current = socket;

    } catch (error) {
      console.error('Error initializing socket:', error);
      setConnectionError(`ソケット初期化エラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
      setIsInitialized(true); // エラーでも初期化は完了したとみなす
      return () => {};
    }

    // クリーンアップ関数
    return () => {
      console.log('Cleaning up socket connection');
      if (socketRef.current) {
        if (channelId && socketRef.current.connected) {
          console.log(`Leaving channel: ${channelId}`);
          socketRef.current.emit('leaveChannel', channelId);
        }
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [channelId]); // channelIdが変わったら再接続

  // チャンネルを変更する関数
  const changeChannel = useCallback((newChannelId: string) => {
    const socket = socketRef.current;
    if (!socket || !socket.connected) {
      console.warn('Cannot change channel: socket not connected');
      return;
    }

    console.log(`Changing channel from ${channelId} to ${newChannelId}`);

    // 現在のチャンネルから退出
    if (channelId) {
      console.log(`Leaving channel: ${channelId}`);
      socket.emit('leaveChannel', channelId);
    }

    // 新しいチャンネルに参加
    console.log(`Joining channel: ${newChannelId}`);
    socket.emit('joinChannel', newChannelId);
    
    // メッセージをクリア
    setMessages([]);
    
    // チャンネルの過去メッセージを取得（サーバー側で実装されている場合）
    socket.emit('getChannelHistory', { channelId: newChannelId });
  }, [channelId]);

  // メッセージを送信する関数
  const sendMessage = useCallback((message: string) => {
    const socket = socketRef.current;
    if (!socket || !socket.connected || !channelId) {
      console.warn('Cannot send message: socket not connected or no channel selected');
      return;
    }

    console.log(`Sending message to channel ${channelId}: ${message}`);
    const messageData = {
      channelId,
      message,
      sender: username,
      timestamp: new Date().toISOString(), // クライアント側でタイムスタンプを生成
    };

    // 楽観的UIアップデート（サーバーからの応答を待たずにUIを更新）
    setMessages(prev => [...prev, messageData]);
    
    // サーバーにメッセージを送信
    socket.emit('sendMessage', messageData);
  }, [channelId, username]);

  // タイピング中の通知を送信する関数
  const sendTypingNotification = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || !socket.connected || !channelId) {
      return;
    }

    socket.emit('typing', { channelId, username });
  }, [channelId, username]);

  return {
    isConnected,
    messages,
    usersTyping,
    sendMessage,
    sendTypingNotification,
    changeChannel,
    connectionError,
    isInitialized,
  };
}; 