'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import ServerSidebar from './ServerSidebar';
import { useSidebar } from '@/context/SidebarContext';
import { parseMessageContent } from '@/utils/messageParser';

// APIのベースURLを定義
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// WebSocketのURLを定義
// バックエンドのポート番号を使用するように修正
const getWebSocketUrl = () => {
  if (typeof window === 'undefined') return '';
  
  // 開発環境でのデバッグ用にモックWebSocketサーバーを使用するオプション
  if (process.env.NEXT_PUBLIC_USE_MOCK_WS === 'true') {
    console.log('モックWebSocketサーバーを使用します');
    return 'ws://localhost:8080'; // モックWebSocketサーバーのURL
  }
  
  // APIのURLからWebSocketのURLを構築
  try {
    // API_URLが設定されている場合はそれを使用
    if (API_URL) {
      // API_URLからホスト部分を抽出
      const apiUrl = new URL(API_URL);
      const protocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = apiUrl.host; // ホスト名とポート番号を含む
      
      console.log('WebSocket URL構築情報:', {
        apiUrl: API_URL,
        parsedUrl: apiUrl.toString(),
        protocol: protocol,
        host: host
      });
      
      // 環境変数で明示的に指定されている場合はそれを使用
      if (process.env.NEXT_PUBLIC_WS_URL) {
        console.log('環境変数からWebSocket URLを使用:', process.env.NEXT_PUBLIC_WS_URL);
        return process.env.NEXT_PUBLIC_WS_URL;
      }
      
      // APIのURLからWebSocketのURLを構築
      return `${protocol}//${host}`;
    }
  } catch (error) {
    console.error('WebSocket URL構築エラー:', error);
  }
  
  // フォールバック: 現在のページのホストを使用
  try {
    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      console.log('フォールバックWebSocket URL構築:', { protocol, host });
      return `${protocol}//${host}`;
    }
  } catch (error) {
    console.error('フォールバックWebSocket URL構築エラー:', error);
  }
  
  // 最終フォールバック
  console.log('最終フォールバックWebSocket URLを使用: ws://localhost:3000');
  return 'ws://localhost:3000';
};

const WS_URL = getWebSocketUrl();

// パラメータの型定義
type ChannelParams = {
  id?: string;
};

// SVGアイコンコンポーネント
const PaperClipIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
  </svg>
);

const PencilIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
  </svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
  </svg>
);

const XMarkIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

interface Attachment {
  id: string;
  fileName: string;
  fileType: string;
  filePath: string;
  fileSize: number;
  uploadedAt: string;
}

interface Message {
  id: string;
  content: string;
  role: string;
  timestamp: string;
  channelId: string;
  userId: string;
  username?: string; // ユーザー名を追加
  attachments: string[];
  isEdited: boolean;
  isDeleted: boolean;
  editedAt?: string;
}

export default function ChannelRoom() {
  const params = useParams() as ChannelParams;
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editingAttachments, setEditingAttachments] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isSidebarOpen } = useSidebar();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  // WebSocket接続を保持するref
  const wsRef = useRef<WebSocket | null>(null);
  // WebSocketの接続状態を保持する状態
  const [wsConnected, setWsConnected] = useState(false);
  // WebSocketが利用可能かどうかを示す状態
  const [wsAvailable, setWsAvailable] = useState(true);
  // クライアントサイドでのレンダリングかどうかを判断するための状態
  const [isClient, setIsClient] = useState(false);
  // ポーリング用のインターバルIDを保持するref
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // 最後に取得したメッセージのIDを保持するref
  const lastMessageIdRef = useRef<string | null>(null);
  // チャンネル名を保持する状態
  const [channelName, setChannelName] = useState<string>('');
  // 接続試行回数
  const reconnectAttemptsRef = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 3;
  // 現在のユーザーID
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  // サーバー所有者かどうか
  const [isServerOwner, setIsServerOwner] = useState(false);
  // サーバーID
  const [serverId, setServerId] = useState<string | null>(null);

  // コンポーネントの初期化時にデバッグ情報を出力
  console.log('ChannelRoomコンポーネントが初期化されました');
  console.log('パラメータ:', params);
  console.log('環境変数:', {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
    NEXT_PUBLIC_FRONTEND_URL: process.env.NEXT_PUBLIC_FRONTEND_URL,
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
  });

  // クライアントサイドでのレンダリングを検出
  useEffect(() => {
    setIsClient(true);
    
    // 現在のユーザーIDを取得
    const fetchCurrentUser = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        const response = await fetch(`${API_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (response.ok) {
          const userData = await response.json();
          setCurrentUserId(userData.id);
          
          // ユーザーIDが取得できたら、サーバー所有者情報を取得
          if (params.id) {
            fetchServerOwnerInfo();
          }
        }
      } catch (error) {
        console.error('ユーザー情報の取得に失敗しました:', error);
      }
    };
    
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (params.id) {
      // 前回のチャンネルのクリーンアップを確実に行う
      disconnectWebSocket();
      stopPolling();
      
      // 状態をリセット
      setMessages([]);
      lastMessageIdRef.current = null;
      
      // 新しいチャンネルのデータを取得
      fetchMessages();
      
      // 少し遅延させてからWebSocket接続を試みる
      const connectTimer = setTimeout(() => {
        if (typeof window !== 'undefined' && 'WebSocket' in window) {
          connectWebSocket();
        } else {
          console.log('WebSocketがサポートされていません。ポーリングモードで動作します。');
          setWsAvailable(false);
          startPolling();
        }
      }, 500);
      
      // チャンネル名を設定
      fetchChannelName();
      
      // currentUserIdが既に取得できている場合のみサーバー所有者情報を取得
      if (currentUserId) {
        fetchServerOwnerInfo();
      }
      
      // クリーンアップ関数
      return () => {
        clearTimeout(connectTimer);
        disconnectWebSocket();
        stopPolling();
      };
    }
  }, [params.id]);

  // currentUserIdが変更された時にサーバー所有者情報を取得
  useEffect(() => {
    if (currentUserId && params.id) {
      fetchServerOwnerInfo();
    }
  }, [currentUserId, params.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Clean up preview URLs when component unmounts
  useEffect(() => {
    return () => {
      previewUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async (isPolling = false) => {
    try {
      if (!params.id) {
        console.error('チャンネルIDが指定されていません');
        return;
      }
      
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('認証トークンがありません');
        setError('認証トークンがありません。再度ログインしてください。');
        return;
      }
      
      console.log(`チャンネルID ${params.id} のメッセージを取得中...`);
      
      // ポーリング時は最後のメッセージID以降のメッセージのみを取得
      let url = `${API_URL}/api/channels/${params.id}/messages`;
      if (isPolling && lastMessageIdRef.current) {
        url += `?after=${lastMessageIdRef.current}`;
        console.log(`最後のメッセージID ${lastMessageIdRef.current} 以降のメッセージを取得します`);
      }
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('レスポンスステータス:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`メッセージ取得エラー: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`メッセージの取得に失敗しました: ${response.status} ${response.statusText}`);
      }

      // レスポンスの生データを確認
      const responseText = await response.text();
      
      // 空のレスポンスの場合は早期リターン
      if (!responseText || responseText.trim() === '') {
        console.warn('レスポンスが空です');
        if (!isPolling) {
          setMessages([]);
        }
        return;
      }
      
      // JSONとしてパース
      let data: any = null;
      try {
        data = JSON.parse(responseText);
        
        // データが配列の場合（直接メッセージの配列が返される場合）
        if (Array.isArray(data)) {
          if (data.length > 0) {
            // 最後のメッセージIDを更新
            const lastMessage = data[data.length - 1];
            if (lastMessage && lastMessage.id) {
              lastMessageIdRef.current = lastMessage.id;
              console.log('最後のメッセージIDを更新:', lastMessageIdRef.current);
            }
            
            // ユーザー名を取得
            const messagesWithUsernames = await fetchUsernames(data);
            
            if (isPolling) {
              // ポーリングの場合は既存のメッセージに新しいメッセージを追加（重複を防ぐ）
        setMessages(prevMessages => {
                // 既存のメッセージIDのセットを作成
                const existingIds = new Set(prevMessages.map(msg => msg.id));
                // 重複しないメッセージのみをフィルタリング
                const newMessages = messagesWithUsernames.filter((msg: Message) => !existingIds.has(msg.id));
                console.log('新しいメッセージを追加:', newMessages.length);
                
                if (newMessages.length === 0) {
                  return prevMessages; // 新しいメッセージがなければ状態を更新しない
                }
                
                return [...prevMessages, ...newMessages];
              });
            } else {
              // 初回読み込みの場合はすべてのメッセージを設定
              setMessages(messagesWithUsernames);
              console.log('すべてのメッセージを設定:', messagesWithUsernames.length);
            }
          } else if (!isPolling) {
            // データが空で初回読み込みの場合は空の配列を設定
            setMessages([]);
          }
          return;
        }
        
        // データがオブジェクトで、messagesプロパティがある場合
        if (data && typeof data === 'object' && 'messages' in data) {
          // messagesがnullでないことを確認
          if (data.messages === null) {
            console.warn('messagesプロパティがnullです');
            if (!isPolling) {
              setMessages([]);
            }
            return;
          }
          
          // messagesが配列であることを確認
          if (!Array.isArray(data.messages)) {
            console.warn('messagesプロパティが配列ではありません:', typeof data.messages);
            if (!isPolling) {
              setMessages([]);
            }
            return;
          }
          
          if (data.messages.length > 0) {
            // 最後のメッセージIDを更新
            const lastMessage = data.messages[data.messages.length - 1];
            if (lastMessage && lastMessage.id) {
              lastMessageIdRef.current = lastMessage.id;
              console.log('最後のメッセージIDを更新:', lastMessageIdRef.current);
            }
            
            // ユーザー名を取得
            const messagesWithUsernames = await fetchUsernames(data.messages);
            
            if (isPolling) {
              // ポーリングの場合は既存のメッセージに新しいメッセージを追加（重複を防ぐ）
        setMessages(prevMessages => {
                // 既存のメッセージIDのセットを作成
                const existingIds = new Set(prevMessages.map(msg => msg.id));
                // 重複しないメッセージのみをフィルタリング
                const newMessages = messagesWithUsernames.filter((msg: Message) => !existingIds.has(msg.id));
                console.log('新しいメッセージを追加:', newMessages.length);
                
                if (newMessages.length === 0) {
                  return prevMessages; // 新しいメッセージがなければ状態を更新しない
                }
                
                return [...prevMessages, ...newMessages];
              });
            } else {
              // 初回読み込みの場合はすべてのメッセージを設定
              setMessages(messagesWithUsernames);
              console.log('すべてのメッセージを設定:', messagesWithUsernames.length);
            }
          } else if (!isPolling) {
            // データが空で初回読み込みの場合は空の配列を設定
            setMessages([]);
          }
          return;
        }
        
        // その他の場合
        console.warn('予期しないデータ形式です:', data);
        if (!isPolling) {
          setMessages([]);
        }
      } catch (err) {
        console.error('JSONパースエラー:', err);
        setError(err instanceof Error ? err.message : '予期せぬエラーが発生しました');
        if (!isPolling) {
          setMessages([]);
        }
      }
    } catch (err) {
      console.error('メッセージ取得エラー:', err);
      setError(err instanceof Error ? err.message : '予期せぬエラーが発生しました');
      if (!isPolling) {
        setMessages([]);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newMessage.trim() === '' && selectedFiles.length === 0) {
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      
      // ファイルがある場合はファイルアップロードとメッセージを一緒に送信
      if (selectedFiles.length > 0) {
        // メッセージを先に送信して、メッセージIDを取得
        let messageId = '';
        if (newMessage.trim() !== '') {
          const messageResponse = await fetch(`${API_URL}/api/channels/${params.id}/messages`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              content: newMessage,
            }),
          });
          
          if (!messageResponse.ok) {
            const errorData = await messageResponse.json().catch(() => ({ error: 'メッセージの送信に失敗しました' }));
            throw new Error(errorData.error || 'メッセージの送信に失敗しました');
          }
          
          const messageData = await messageResponse.json();
          messageId = messageData.id || messageData.message?.id;
          console.log('メッセージを作成しました:', messageId);
        }
        
        // ファイルがある場合は、作成したメッセージIDを使ってファイルをアップロード
        if (selectedFiles.length > 0 && params.id) {
          for (const file of selectedFiles) {
            const formData = new FormData();
            formData.append('file', file);
            
            // メッセージIDがない場合（テキストなしでファイルのみの場合）は空のメッセージを作成
            if (!messageId) {
              const emptyMessageResponse = await fetch(`${API_URL}/api/channels/${params.id}/messages`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                  content: '',
                }),
              });
              
              if (!emptyMessageResponse.ok) {
                throw new Error('空のメッセージの作成に失敗しました');
              }
              
              const emptyMessageData = await emptyMessageResponse.json();
              messageId = emptyMessageData.id || emptyMessageData.message?.id;
              console.log('空のメッセージを作成しました:', messageId);
            } else {
              console.log('既存のメッセージIDを使用:', messageId);
            }
            
            console.log('ファイルをアップロード中:', file.name, 'サイズ:', file.size, 'タイプ:', file.type, 'メッセージID:', messageId);
            
            // 元のエンドポイントに戻す
            const uploadUrl = `${API_URL}/api/channels/${params.id}/upload`;
            console.log('アップロードURL:', uploadUrl);
            console.log('フォームデータ内容:', {
              messageId: messageId,
              fileName: file.name,
              fileSize: file.size,
              fileType: file.type
            });
            
            // messageIdをフォームデータに含める
            formData.append('messageId', messageId);
            // channelIdもフォームデータに含める
            formData.append('channelId', params.id);
            
            const uploadResponse = await fetch(uploadUrl, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
              },
              body: formData,
            });
            
            if (!uploadResponse.ok) {
              const errorText = await uploadResponse.text();
              console.error('アップロードエラー:', uploadResponse.status, uploadResponse.statusText);
              console.error('エラーレスポンス:', errorText);
              console.error('送信したデータ:', {
                url: uploadUrl,
                messageId: messageId,
                channelId: params.id,
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type
              });
              
              // エラーの詳細情報を取得
              let errorMessage = `ファイルのアップロードに失敗しました: ${uploadResponse.status} ${uploadResponse.statusText}`;
              
              try {
                // JSONとしてパースを試みる
                const errorData = JSON.parse(errorText);
                if (errorData.error) {
                  errorMessage = errorData.error;
                } else if (errorData.message) {
                  errorMessage = `ファイルのアップロードに失敗しました: ${errorData.message}`;
                } else if (errorData.detail) {
                  errorMessage = `ファイルのアップロードに失敗しました: ${errorData.detail}`;
                }
                
                // スタックトレースがあれば記録（デバッグ用）
                if (errorData.stack) {
                  console.error('エラースタックトレース:', errorData.stack);
                }
                
                throw new Error(errorMessage);
              } catch (parseError) {
                // JSONパースに失敗した場合はテキストをそのまま使用
                console.error('エラーレスポンスのパースに失敗:', parseError);
                throw new Error(`ファイルのアップロードに失敗しました: ${uploadResponse.status} ${uploadResponse.statusText} - ${errorText}`);
              }
            }
            
            const responseData = await uploadResponse.json();
            console.log('アップロード成功:', responseData);
          }
        }
      } 
      // ファイルがなく、テキストメッセージのみの場合
      else if (newMessage.trim() !== '') {
        const messageResponse = await fetch(`${API_URL}/api/channels/${params.id}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            content: newMessage,
          }),
        });
        
        if (!messageResponse.ok) {
          const errorData = await messageResponse.json().catch(() => ({ error: 'メッセージの送信に失敗しました' }));
          throw new Error(errorData.error || 'メッセージの送信に失敗しました');
        }
      }

      setNewMessage('');
      setSelectedFiles([]);
      setPreviewUrls([]);
      
      // WebSocketが接続されていない場合は、メッセージを再取得
      if (!wsConnected || !wsAvailable) {
        fetchMessages();
      }
    } catch (err) {
      console.error('Error in handleSubmit:', err);
      setError(err instanceof Error ? err.message : '予期せぬエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  // Enterキーでメッセージを送信し、Shift+Enterで改行する処理
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (newMessage.trim() !== '' || selectedFiles.length > 0) {
        handleSubmit(e as unknown as React.FormEvent);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...filesArray]);
      
      // Create preview URLs
      const newPreviewUrls = filesArray.map(file => URL.createObjectURL(file));
      setPreviewUrls(prev => [...prev, ...newPreviewUrls]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    URL.revokeObjectURL(previewUrls[index]);
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const startEditing = (message: Message) => {
    setEditingMessageId(message.id);
    setEditContent(message.content);
    setEditingAttachments(message.attachments || []);
  };

  const cancelEditing = () => {
    setEditingMessageId(null);
    setEditContent('');
    setEditingAttachments([]);
  };

  const saveEdit = async () => {
    if (!editingMessageId || !editContent.trim()) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/messages/${editingMessageId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ content: editContent }),
      });

      if (!response.ok) {
        throw new Error('メッセージの編集に失敗しました');
      }

      // WebSocketが接続されていない場合は、メッセージを再取得
      if (!wsConnected || !wsAvailable) {
        fetchMessages();
      }
      
      cancelEditing();
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期せぬエラーが発生しました');
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!confirm('このメッセージを削除しますか？')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/channels/messages/${messageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        // エラーレスポンスの詳細を取得
        const errorText = await response.text();
        console.error('メッセージ削除エラー:', response.status, response.statusText);
        console.error('エラーレスポンス:', errorText);
        
        let errorMessage = `メッセージの削除に失敗しました: ${response.status} ${response.statusText}`;
        
        try {
          // JSONとしてパースを試みる
          const errorData = JSON.parse(errorText);
          if (errorData.error) {
            errorMessage = errorData.error;
          } else if (errorData.message) {
            errorMessage = `メッセージの削除に失敗しました: ${errorData.message}`;
          }
          
          throw new Error(errorMessage);
        } catch (parseError) {
          // JSONパースに失敗した場合はテキストをそのまま使用
          throw new Error(`メッセージの削除に失敗しました: ${errorText || response.statusText}`);
        }
      }

      // WebSocketが接続されていない場合は、メッセージを再取得
      if (!wsConnected || !wsAvailable) {
        fetchMessages();
      } else {
        // WebSocketが接続されている場合は、UIを直接更新
        handleMessageDelete(messageId);
      }
    } catch (err) {
      console.error('メッセージ削除エラー:', err);
      setError(err instanceof Error ? err.message : '予期せぬエラーが発生しました');
    }
  };

  const renderAttachment = (path: string) => {
    // パスからファイル名を抽出
    const fileName = path.split('/').pop() || '';
    const fileExt = fileName.split('.').pop()?.toLowerCase() || '';
    
    // ファイルのURLを構築（パスの重複を防ぐ）
    let normalizedPath = '';
    
    // ファイル名だけの場合（例: 316dc40d-692a-48ea-8ee9-9607d1096589.png）
    if (!path.includes('/')) {
      normalizedPath = `/uploads/${path}`;
    } 
    // すでにuploadsが含まれている場合（例: uploads/316dc40d-692a-48ea-8ee9-9607d1096589.png）
    else if (path.includes('uploads/')) {
      // uploadsの前にスラッシュがない場合は追加
      if (path.startsWith('uploads/')) {
        normalizedPath = `/${path}`;
      } 
      // すでに/uploads/の形式になっている場合はそのまま使用
      else if (path.startsWith('/uploads/')) {
        normalizedPath = path;
      }
      // ./uploads/の形式の場合は/uploads/に変換
      else if (path.startsWith('./uploads/')) {
        normalizedPath = path.replace('./uploads/', '/uploads/');
      }
    }
    // その他の場合は単純に/uploadsを前に追加
    else {
      normalizedPath = `/uploads/${path}`;
    }
    
    const fileUrl = `${API_URL}${normalizedPath}`;
    console.log('Attachment URL:', fileUrl, 'Original path:', path);
    
    // Check if it's an image
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt)) {
      return (
        <div className="mt-2 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
          <div className="relative group">
            <img 
              src={fileUrl} 
              alt={fileName}
              className="max-w-full max-h-64 object-contain mx-auto"
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
              <a 
                href={fileUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="bg-white rounded-full p-2 shadow-md hover:bg-gray-100 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
          <div className="px-3 py-2 text-xs text-gray-500 border-t border-gray-200 flex justify-between items-center">
            <span className="truncate">{fileName}</span>
            <a 
              href={fileUrl}
              download={fileName}
              className="text-indigo-600 hover:text-indigo-800"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </a>
          </div>
        </div>
      );
    }
    
    // Check if it's a video
    if (['mp4', 'webm', 'mov'].includes(fileExt)) {
      return (
        <div className="mt-2 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
          <video 
            controls 
            className="max-w-full max-h-64 mx-auto"
          >
            <source src={fileUrl} type={`video/${fileExt}`} />
            お使いのブラウザはビデオタグをサポートしていません。
          </video>
          <div className="px-3 py-2 text-xs text-gray-500 border-t border-gray-200 flex justify-between items-center">
            <span className="truncate">{fileName}</span>
            <a 
              href={fileUrl}
              download={fileName}
              className="text-indigo-600 hover:text-indigo-800"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </a>
          </div>
        </div>
      );
    }
    
    // For other file types, show a download link
    return (
      <div className="mt-2">
        <a 
          href={fileUrl}
          download={fileName}
          className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors group"
        >
          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mr-3 text-indigo-600 group-hover:bg-indigo-200 transition-colors">
            {fileExt === 'pdf' ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            ) : ['doc', 'docx'].includes(fileExt) ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            ) : ['xls', 'xlsx'].includes(fileExt) ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{fileName}</p>
            <p className="text-xs text-gray-500">{fileExt.toUpperCase()} ファイル</p>
          </div>
          <div className="ml-2 text-indigo-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </div>
        </a>
      </div>
    );
  };

  // WebSocketに接続する関数
  const connectWebSocket = () => {
    if (!params.id) return;
    
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('認証トークンがありません');
      setError('認証トークンがありません。再度ログインしてください。');
      return;
    }
    
    // WebSocketがサポートされているか確認
    if (typeof window === 'undefined' || !('WebSocket' in window)) {
      console.error('このブラウザはWebSocketをサポートしていません');
      setError('このブラウザはWebSocketをサポートしていません。ポーリングモードで動作します。');
      setWsAvailable(false);
      startPolling();
      return;
    }
    
    // 既存の接続があれば切断
    disconnectWebSocket();
    
    // 少し遅延させて、前の接続が完全に閉じられるのを待つ
    setTimeout(() => {
      // 接続試行回数が上限に達した場合はポーリングに切り替え
      if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
        console.log(`WebSocket接続の試行回数が上限(${MAX_RECONNECT_ATTEMPTS}回)に達しました。ポーリングに切り替えます。`);
        setWsAvailable(false);
        startPolling();
        return;
      }
      
      // WebSocketの接続先URL（認証トークンとチャンネルIDを含める）
      // バックエンドの実装に合わせてパスを調整
      const wsUrl = `${WS_URL}/ws/channels/${params.id}?token=${token}`;
      console.log('WebSocket接続を開始:', wsUrl);
      console.log('現在の環境情報:', {
        apiUrl: API_URL,
        wsUrl: WS_URL,
        fullWsUrl: wsUrl,
        protocol: typeof window !== 'undefined' ? window.location.protocol : 'unknown',
        host: typeof window !== 'undefined' ? window.location.host : 'unknown',
        nodeEnv: process.env.NODE_ENV,
        useMockWs: process.env.NEXT_PUBLIC_USE_MOCK_WS
      });
      
      try {
        // WebSocketコンストラクタを使用
        const ws = new window.WebSocket(wsUrl);
        wsRef.current = ws;
        
        // 接続タイムアウト処理
        const connectionTimeoutId = setTimeout(() => {
          if (ws.readyState !== WebSocket.OPEN) {
            console.log('WebSocket接続がタイムアウトしました');
            
            // イベントハンドラをクリアしてからクローズ
            try {
              ws.onclose = null;
              ws.onerror = null;
              ws.onmessage = null;
              ws.onopen = null;
              ws.close();
            } catch (e) {
              console.error('WebSocketクローズ中にエラーが発生しました:', e);
            }
            
            // 最初の接続試行でタイムアウトした場合は、すぐにポーリングに切り替える
            if (reconnectAttemptsRef.current === 0) {
              console.log('WebSocketサーバーが応答しません。ポーリングに切り替えます。');
              setError(`WebSocketサーバーが応答しません。ポーリングモードで動作します。(URL: ${wsUrl})`);
              setWsAvailable(false);
              reconnectAttemptsRef.current = MAX_RECONNECT_ATTEMPTS;
              startPolling();
            } else {
              setError(`WebSocket接続がタイムアウトしました。再接続を試みます... (${reconnectAttemptsRef.current + 1}/${MAX_RECONNECT_ATTEMPTS})`);
              reconnectAttemptsRef.current++;
              
              if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
                setWsAvailable(false);
                startPolling();
              } else {
                setTimeout(() => {
                  connectWebSocket();
                }, 3000);
              }
            }
          }
        }, 5000); // 5秒でタイムアウト
        
        // 接続イベント
        ws.onopen = () => {
          console.log('WebSocket接続が確立されました');
          clearTimeout(connectionTimeoutId); // タイムアウトをクリア
          setWsConnected(true);
          setWsAvailable(true);
          setError('');
          reconnectAttemptsRef.current = 0; // 接続成功したらカウンターをリセット
          stopPolling(); // WebSocket接続が成功したらポーリングを停止
        };
        
        // メッセージ受信イベント
        ws.onmessage = (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data);
            console.log('WebSocketからメッセージを受信:', data);
            
            // メッセージタイプに応じた処理
            if (data.type === 'message') {
              // 新しいメッセージを受信した場合
              handleNewMessage(data.message);
            } else if (data.type === 'message_update') {
              // メッセージが更新された場合
              handleMessageUpdate(data.message);
            } else if (data.type === 'message_delete') {
              // メッセージが削除された場合
              handleMessageDelete(data.messageId);
            }
          } catch (err) {
            console.error('WebSocketメッセージの処理中にエラーが発生しました:', err);
          }
        };
        
        // エラーイベント
        ws.onerror = (error: Event) => {
          clearTimeout(connectionTimeoutId); // タイムアウトをクリア
          
          // WebSocketの状態情報を取得
          const wsState = {
            readyState: ws.readyState,
            readyStateText: ['接続中', '接続済み', '切断中', '切断済み'][ws.readyState] || '不明',
            bufferedAmount: ws.bufferedAmount,
            extensions: ws.extensions || '',
            protocol: ws.protocol || '',
            binaryType: ws.binaryType,
            url: wsUrl
          };
          
          // エラー情報を取得
          let errorMessage = 'WebSocket接続エラー';
          let errorType = 'unknown';
          
          try {
            if (error instanceof ErrorEvent) {
              errorMessage = error.message || 'WebSocket接続エラー';
              errorType = 'ErrorEvent';
            } else if (error.type) {
              errorType = error.type;
            }
          } catch (e) {
            console.error('エラー情報の取得に失敗:', e);
          }
          
          // エラーオブジェクトの詳細情報を取得
          const errorDetails: {
            type: string;
            message: string;
            timestamp: string;
            wsState: any;
            errorObject?: any;
          } = {
            type: errorType,
            message: errorMessage,
            timestamp: new Date().toISOString(),
            wsState: wsState
          };
          
          // 安全にエラーオブジェクトの追加情報を取得
          try {
            if (error && typeof error === 'object') {
              errorDetails.errorObject = {
                toString: String(error),
                typeOf: typeof error,
                keys: Array.isArray(Object.keys(error)) ? Object.keys(error) : [],
                hasType: 'type' in error ? String(error.type) : 'なし',
                hasMessage: 'message' in error ? String((error as any).message) : 'なし'
              };
            } else {
              errorDetails.errorObject = {
                toString: String(error),
                typeOf: typeof error,
                keys: [],
                hasType: 'なし',
                hasMessage: 'なし'
              };
            }
          } catch (e) {
            console.error('エラーオブジェクトの詳細情報取得に失敗:', e);
            errorDetails.errorObject = {
              error: 'エラーオブジェクトの詳細情報取得に失敗しました',
              reason: String(e)
            };
          }
          
          console.error('WebSocketエラー詳細:', errorDetails);
          console.log('WebSocketの詳細:', wsState);
          
          // エラーメッセージを生成
          let displayErrorMessage = `WebSocketサーバーに接続できません。`;
          
          // エラーの種類に応じたメッセージを追加
          if (errorType === 'error') {
            displayErrorMessage += 'ネットワークエラーが発生しました。';
          } else if (errorType === 'close') {
            displayErrorMessage += '接続が閉じられました。';
          }
          
          // WebSocketの状態に応じたメッセージを追加
          displayErrorMessage += `(状態: ${wsState.readyStateText})`;
          
          // 最初の接続試行でエラーが発生した場合は、すぐにポーリングに切り替える
          if (reconnectAttemptsRef.current === 0) {
            console.log('WebSocketサーバーが実装されていないか、接続できません。ポーリングに切り替えます。');
            setError(`${displayErrorMessage} ポーリングモードで動作します。`);
            setWsAvailable(false);
            reconnectAttemptsRef.current = MAX_RECONNECT_ATTEMPTS; // 再接続を試みないようにする
            startPolling();
          } else {
            setError(`${displayErrorMessage} 再接続を試みます... (${reconnectAttemptsRef.current + 1}/${MAX_RECONNECT_ATTEMPTS})`);
            setWsConnected(false);
            reconnectAttemptsRef.current++; // 接続試行回数をインクリメント
            
            // 接続試行回数が上限に達した場合はポーリングに切り替え
            if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
              console.log(`WebSocket接続の試行回数が上限(${MAX_RECONNECT_ATTEMPTS}回)に達しました。ポーリングに切り替えます。`);
              setError(`${displayErrorMessage} 接続試行回数が上限に達したため、ポーリングモードに切り替えます。`);
              setWsAvailable(false);
              startPolling();
            } else {
              // 少し待ってから再接続を試みる
              setTimeout(() => {
                if (wsRef.current?.readyState === WebSocket.CLOSED) {
                  connectWebSocket();
                }
              }, 3000);
            }
          }
        };
        
        // 切断イベント
        ws.onclose = (event: CloseEvent) => {
          clearTimeout(connectionTimeoutId); // タイムアウトをクリア
          console.log('WebSocket接続が閉じられました:', event.code, event.reason);
          setWsConnected(false);
          
          // 切断コードの意味を取得
          const closeReasonText = getWebSocketCloseReason(event.code);
          
          // 正常な切断でない場合は再接続を試みる
          if (event.code !== 1000) {
            reconnectAttemptsRef.current++; // 接続試行回数をインクリメント
            
            // 接続試行回数が上限に達した場合はポーリングに切り替え
            if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
              console.log(`WebSocket接続の試行回数が上限(${MAX_RECONNECT_ATTEMPTS}回)に達しました。ポーリングに切り替えます。`);
              setError(`WebSocket接続が切断されました(コード: ${event.code} - ${closeReasonText})。接続試行回数が上限に達したため、ポーリングモードに切り替えます。`);
              setWsAvailable(false);
              startPolling();
            } else {
              setError(`WebSocket接続が切断されました(コード: ${event.code} - ${closeReasonText})。再接続を試みます。(${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`);
              
              // 少し待ってから再接続を試みる
              setTimeout(() => {
                connectWebSocket();
              }, 3000);
            }
          } else {
            // 正常な切断の場合はエラーメッセージを表示しない
            setError('');
          }
        };
      } catch (err) {
        console.error('WebSocket接続の確立中にエラーが発生しました:', err);
        setError(`WebSocket接続の確立に失敗しました: ${err instanceof Error ? err.message : '不明なエラー'}`);
        setWsAvailable(false);
        startPolling();
      }
    }, 1000); // 1秒待つ
  };
  
  // WebSocketの切断コードの意味を取得する関数
  const getWebSocketCloseReason = (code: number): string => {
    const closeReasons: Record<number, string> = {
      1000: '正常終了',
      1001: 'エンドポイントが離脱',
      1002: 'プロトコルエラー',
      1003: '受信不可能なデータ',
      1004: '予約済み',
      1005: '切断理由なし',
      1006: '異常終了',
      1007: 'データ型の不一致',
      1008: 'ポリシー違反',
      1009: 'メッセージが大きすぎる',
      1010: '拡張機能のネゴシエーション失敗',
      1011: '予期せぬエラー',
      1012: 'サービス再起動',
      1013: '一時的なエラー',
      1014: 'サーバーが不正な応答を返した',
      1015: 'TLS接続失敗'
    };
    
    return closeReasons[code] || '不明な理由';
  };
  
  // WebSocket接続を切断する関数
  const disconnectWebSocket = () => {
    if (wsRef.current) {
      try {
        console.log('WebSocket接続を切断します');
        
        // 接続状態に応じた処理
        if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
          // イベントハンドラをクリア（エラー発生を防止）
          wsRef.current.onclose = null;
          wsRef.current.onerror = null;
          wsRef.current.onmessage = null;
          wsRef.current.onopen = null;
          
          // 接続を閉じる
          wsRef.current.close(1000, 'チャンネル変更による切断');
        }
        
        // 参照をクリア
        wsRef.current = null;
        setWsConnected(false);
      } catch (error) {
        console.error('WebSocket切断中にエラーが発生しました:', error);
        // エラーが発生しても参照はクリアする
        wsRef.current = null;
        setWsConnected(false);
      }
    }
  };
  
  // ポーリングを開始する関数
  const startPolling = () => {
    // 既存のポーリングがあれば停止
    stopPolling();
    
    console.log('メッセージポーリングを開始します');
    
    // 5秒ごとにメッセージを取得
    pollingIntervalRef.current = setInterval(() => {
      console.log('ポーリングによるメッセージ取得');
      fetchMessages(true); // ポーリングフラグをtrueに設定
    }, 5000);
  };
  
  // ポーリングを停止する関数
  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
      console.log('メッセージポーリングを停止しました');
    }
  };
  
  // 新しいメッセージを処理する関数
  const handleNewMessage = async (message: Message) => {
    try {
      // ユーザー名を取得
      const messagesWithUsernames = await fetchUsernames([message]);
      const messageWithUsername = messagesWithUsernames[0];
      
        setMessages(prevMessages => {
        // 既存のメッセージIDのセットを作成
        const existingIds = new Set(prevMessages.map(msg => msg.id));
        
        // 既に同じIDのメッセージがある場合は追加しない
        if (existingIds.has(message.id)) {
          return prevMessages;
        }
        
        // 最後のメッセージIDを更新（ポーリング用）
        if (message.id) {
          lastMessageIdRef.current = message.id;
        }
        
        return [...prevMessages, messageWithUsername];
      });
    } catch (error) {
      console.error('新しいメッセージの処理中にエラーが発生しました:', error);
      // エラーが発生した場合でもメッセージは追加する
        setMessages(prevMessages => {
        // 既存のメッセージIDのセットを作成
        const existingIds = new Set(prevMessages.map(msg => msg.id));
        if (existingIds.has(message.id)) return prevMessages;
        if (message.id) lastMessageIdRef.current = message.id;
        return [...prevMessages, message];
      });
    }
  };
  
  // メッセージ更新を処理する関数
  const handleMessageUpdate = async (updatedMessage: Message) => {
    try {
      // ユーザー名を取得
      const messagesWithUsernames = await fetchUsernames([updatedMessage]);
      const messageWithUsername = messagesWithUsernames[0];
      
        setMessages(prevMessages =>
          prevMessages.map(msg =>
            msg.id === updatedMessage.id ? messageWithUsername : msg
          )
        );
    } catch (error) {
      console.error('メッセージ更新の処理中にエラーが発生しました:', error);
      // エラーが発生した場合でもメッセージは更新する
        handleMessageDelete(updatedMessage.id);
    }
  };
  
  // メッセージ削除を処理する関数
  const handleMessageDelete = (messageId: string) => {
    setMessages(prevMessages => 
      prevMessages.filter(msg => msg.id !== messageId)
    );
  };

  // チャンネル名を取得する関数
  const fetchChannelName = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('認証トークンがありません');
        return;
      }

      // サーバー一覧を取得
      const serversResponse = await fetch(`${API_URL}/api/servers`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!serversResponse.ok) {
        console.error('サーバー情報の取得に失敗しました');
        setChannelName(`チャンネル-${params.id}`);
        return;
      }
      
      const serversData = await serversResponse.json();
      const servers = serversData.servers || [];
      
      // 各サーバーのチャンネル一覧を取得して、現在のチャンネルIDに一致するチャンネルを探す
      for (const server of servers) {
        const channelsResponse = await fetch(`${API_URL}/api/servers/${server.id}/channels`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (channelsResponse.ok) {
          const channelsData = await channelsResponse.json();
          const channels = channelsData.channels || [];
          
          // 現在のチャンネルIDに一致するチャンネルを探す
          const currentChannel = channels.find((channel: { id: string, name: string }) => channel.id === params.id);
          if (currentChannel) {
            console.log('チャンネル情報:', currentChannel);
            setChannelName(currentChannel.name);
            return;
          }
        }
      }
      
      // チャンネルが見つからなかった場合はデフォルト名を設定
      setChannelName(`チャンネル-${params.id}`);
    } catch (error) {
      console.error('チャンネル名の取得中にエラーが発生しました:', error);
      setChannelName(`チャンネル-${params.id}`);
    }
  };

  // WebSocketモードとポーリングモードを切り替える関数
  const toggleConnectionMode = () => {
    if (wsAvailable) {
      // WebSocketモードからポーリングモードに切り替え
      disconnectWebSocket();
      setWsAvailable(false);
      startPolling();
      setError('ポーリングモードに切り替えました');
    } else {
      // ポーリングモードからWebSocketモードに切り替え
      stopPolling();
      setWsAvailable(true);
      reconnectAttemptsRef.current = 0; // 接続試行回数をリセット
      connectWebSocket();
      setError('WebSocketモードに切り替えました');
    }
  };

  // WebSocketの接続状態を表すアイコン
  const ConnectionStatusIcon = () => {
    if (!isClient) return null;
    
    if (wsConnected) {
      // 接続済み
      return (
        <div className="flex items-center text-green-500 text-xs">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>WebSocket接続中</span>
        </div>
      );
    } else if (wsAvailable) {
      // 接続試行中
      return (
        <div className="flex items-center text-yellow-500 text-xs">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>接続試行中...</span>
        </div>
      );
    } else {
      // ポーリングモード
      return (
        <div className="flex items-center text-blue-500 text-xs">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>ポーリングモード</span>
        </div>
      );
    }
  };

  // サーバー所有者情報を取得する関数
  const fetchServerOwnerInfo = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token || !params.id) return;
      
      // チャンネルIDからサーバー情報を取得
      const response = await fetch(`${API_URL}/api/channels/${params.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const channelData = await response.json();
        if (channelData.serverId) {
          setServerId(channelData.serverId);
          
          // サーバー情報を取得
          const serverResponse = await fetch(`${API_URL}/api/servers/${channelData.serverId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          
          if (serverResponse.ok) {
            const serverData = await serverResponse.json();
            // 現在のユーザーがサーバー所有者かどうかを確認
            if (currentUserId && serverData.ownerId === currentUserId) {
              setIsServerOwner(true);
            }
          }
        }
      }
    } catch (error) {
      console.error('サーバー所有者情報の取得に失敗しました:', error);
    }
  };

  // ユーザー名を取得する関数
  const fetchUsernames = async (messages: Message[]): Promise<Message[]> => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return messages;
      
      // ユーザーIDの一覧を取得
      const userIds = [...new Set(messages.map(msg => msg.userId))];
      console.log('ユーザーID一覧:', userIds);
      
      // 現在のユーザー情報を取得
      let currentUser = null;
      try {
        const currentUserResponse = await fetch(`${API_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (currentUserResponse.ok) {
          currentUser = await currentUserResponse.json();
          console.log('現在のユーザー情報:', currentUser);
        } else {
          console.info('現在のユーザー情報の取得に失敗しました');
        }
      } catch (err) {
        console.info('現在のユーザー情報の取得中にエラーが発生しました');
      }
      
      // ユーザー情報を取得
      const userPromises = userIds.map(userId => 
        fetch(`${API_URL}/api/users/${userId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })
        .then(res => {
          if (res.ok) {
            return res.json();
          } else {
            console.info(`ユーザー情報が見つかりませんでした (ID: ${userId}), ステータス: ${res.status}`);
            // ユーザー情報が取得できない場合でも、ユーザーIDを含むオブジェクトを返す
            return { id: userId, username: `ユーザー` };
          }
        })
        .catch(err => {
          console.info(`ユーザー情報の取得中にエラーが発生しました (ID: ${userId})`);
          // エラーが発生した場合でも、ユーザーIDを含むオブジェクトを返す
          return { id: userId, username: `ユーザー` };
        })
      );
      
      const users = await Promise.all(userPromises);
      console.log('取得したユーザー情報:', users);
      
      // ユーザーIDとユーザー名のマッピングを作成
      const userMap = new Map();
      users.forEach(user => {
        if (user && user.id) {
          userMap.set(user.id, user.username);
        }
      });
      console.log('ユーザー名マッピング:', Object.fromEntries(userMap));
      
      // メッセージにユーザー名を追加
      const messagesWithUsernames = messages.map(msg => {
        const username = userMap.get(msg.userId);
        console.log(`メッセージID: ${msg.id}, ユーザーID: ${msg.userId}, 取得したユーザー名: ${username}`);
        return {
          ...msg,
          username: username || `ユーザー`
        };
      });
      
      console.log('ユーザー名を追加したメッセージ:', messagesWithUsernames.map(msg => ({
        id: msg.id,
        userId: msg.userId,
        username: msg.username
      })));
      
      return messagesWithUsernames;
    } catch (error) {
      console.error('ユーザー名の取得に失敗しました:', error);
      // エラーが発生した場合でも、各メッセージにユーザー名を設定
      return messages.map(msg => ({
        ...msg,
        username: `ユーザー`
      }));
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-indigo-50 to-blue-50">
      <ServerSidebar />
      <div className={`flex-1 flex flex-col ${isSidebarOpen ? 'ml-64' : 'ml-20'} transition-all duration-300`}>
        <div className="bg-white shadow-sm p-4 flex justify-between items-center">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-gray-800"># {channelName}</h1>
            <div className="ml-4">
              <ConnectionStatusIcon />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {/* WebSocketモード切り替えボタン */}
            <button
              onClick={toggleConnectionMode}
              className={`px-3 py-1 rounded text-xs font-medium ${
                wsAvailable
                  ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              {wsAvailable ? 'ポーリングモードに切り替え' : 'WebSocketモードに切り替え'}
            </button>
          </div>
        </div>
        {/* メッセージエリア */}
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-4"
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-lg font-medium text-indigo-600">メッセージはまだありません</p>
              <p className="text-sm text-gray-500 mt-1">最初のメッセージを送信しましょう！</p>
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className={`flex ${message.userId === currentUserId ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] rounded-2xl p-4 ${
                  message.userId === currentUserId 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-white shadow-md'
                } ${message.isDeleted ? 'opacity-60' : ''} group`}>
                  
                  {/* メッセージコンテンツ */}
                  {message.isDeleted ? (
                    <div className="flex items-center space-x-2 text-sm italic">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <p>このメッセージは削除されました</p>
                    </div>
                  ) : editingMessageId === message.id ? (
                    <div className="space-y-3">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-800 resize-none"
                        rows={3}
                      />
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={cancelEditing}
                          className="px-4 py-2 bg-gray-200 rounded-lg text-gray-700 text-sm font-medium transition-colors hover:bg-gray-300"
                        >
                          キャンセル
                        </button>
                        <button
                          onClick={saveEdit}
                          className="px-4 py-2 bg-indigo-600 rounded-lg text-white text-sm font-medium transition-colors hover:bg-indigo-700"
                        >
                          保存
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="mb-2 flex justify-between items-center">
                        <span className="font-medium text-sm">
                          {(() => {
                            console.log('メッセージユーザー名:', message.username, 'ユーザーID:', message.userId);
                            return message.username || 'ユーザー';
                          })()}
                        </span>
                        <span className={`text-xs ${message.userId === currentUserId ? 'text-indigo-200' : 'text-gray-500'}`}>
                          {new Date(message.timestamp).toLocaleString('ja-JP', {
                            month: 'numeric',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                          {message.isEdited && <span className="ml-1">(編集済み)</span>}
                        </span>
                      </div>
                      
                      <div className={`whitespace-pre-wrap break-words ${message.userId === currentUserId ? 'text-white' : 'text-gray-800'}`}>
                        {parseMessageContent(message.content)}
                      </div>
                      
                      {/* 添付ファイル */}
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {message.attachments.map((attachment, index) => (
                            <div key={index} className="rounded-lg overflow-hidden">
                              {renderAttachment(attachment)}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* メッセージアクション */}
                      {/* 自分のメッセージ、または管理者の場合に編集・削除ボタンを表示 */}
                      {!message.isDeleted && (
                        <div className="mt-2 flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {/* 自分のメッセージのみ編集可能 */}
                          {message.userId === currentUserId && (
                            <button
                              onClick={() => startEditing(message)}
                              className="p-1.5 rounded-full bg-indigo-500 bg-opacity-20 text-white hover:bg-opacity-30 transition-colors"
                            >
                              <PencilIcon />
                            </button>
                          )}
                          {/* 自分のメッセージまたは管理者は削除可能 */}
                          {(message.userId === currentUserId || (isServerOwner && message.userId !== currentUserId)) && (
                            <button
                              onClick={() => deleteMessage(message.id)}
                              className="p-1.5 rounded-full bg-indigo-500 bg-opacity-20 text-white hover:bg-opacity-30 transition-colors"
                            >
                              <TrashIcon />
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
        
        {/* エラーメッセージ */}
        {error && (
          <div className="mx-4 mb-4 bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-r-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="font-medium">{error}</p>
              </div>
              {/* WebSocketの再接続ボタン */}
              {!wsConnected && wsAvailable && (
                <button
                  onClick={() => {
                    reconnectAttemptsRef.current = 0;
                    connectWebSocket();
                  }}
                  className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 transition-colors text-xs font-medium"
                >
                  再接続
                </button>
              )}
            </div>
          </div>
        )}
        
        {/* メッセージ入力エリア - 固定 */}
        <div className="bg-white border-t p-4 sticky bottom-0 z-10">
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* 選択されたファイルのプレビュー */}
            {previewUrls.length > 0 && (
              <div className="flex flex-wrap gap-3 mb-3 p-3 bg-gray-50 rounded-lg">
                {previewUrls.map((url, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={url}
                      alt={`プレビュー ${index + 1}`}
                      className="h-24 w-24 object-cover rounded-lg border border-gray-200 shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
                    >
                      <XMarkIcon />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex items-end space-x-2">
              <div className="flex-1 relative">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="メッセージを入力... (Enterで送信、Shift+Enterで改行)"
                  className="w-full p-4 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none shadow-sm transition-all"
                  rows={2}
                  disabled={isLoading}
                />
                
                {/* ファイル添付ボタン */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute right-3 bottom-3 p-2 text-gray-500 hover:text-indigo-600 transition-colors"
                  disabled={isLoading}
                  title="ファイルを添付"
                >
                  <PaperClipIcon />
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                  />
                </button>
              </div>
              
              {/* 送信ボタン */}
              <button
                type="submit"
                className={`p-4 rounded-full shadow-md flex items-center justify-center transition-colors ${
                  isLoading || (newMessage.trim() === '' && selectedFiles.length === 0)
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
                disabled={isLoading || (newMessage.trim() === '' && selectedFiles.length === 0)}
                title="メッセージを送信"
              >
                {isLoading ? (
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 