import { Server as SocketIOServer } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

// WebSocketサーバーのインスタンスを保持する変数
let io;

// チャンネルごとのメッセージ履歴を保持するオブジェクト
const channelMessages = {};

// 最大メッセージ履歴数
const MAX_HISTORY = 100;

export default function SocketHandler(req, res) {
  // WebSocketサーバーが既に初期化されている場合は再利用
  if (io) {
    console.log('Socket.io already initialized');
    res.end();
    return;
  }

  // res.socketをHTTPサーバーとして使用
  const httpServer = res.socket.server;
  
  // Next.jsのAPIルートでSocket.ioを使用するための設定
  if (!httpServer.io) {
    console.log('Initializing Socket.io server...');
    
    // Socket.ioサーバーを初期化
    io = new SocketIOServer(httpServer, {
      path: '/api/socketio',
      addTrailingSlash: false,
      // CORS設定（必要に応じて調整）
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      // WebSocketの設定
      transports: ['websocket', 'polling'],
    });

    // WebSocketイベントの処理
    io.on('connection', socket => {
      console.log('Client connected:', socket.id);

      // チャンネルに参加
      socket.on('joinChannel', (channelId) => {
        socket.join(channelId);
        console.log(`User ${socket.id} joined channel ${channelId}`);
        
        // チャンネルに参加したことを他のユーザーに通知
        socket.to(channelId).emit('userJoined', {
          userId: socket.id,
          timestamp: new Date().toISOString()
        });
      });

      // チャンネルから退出
      socket.on('leaveChannel', (channelId) => {
        socket.leave(channelId);
        console.log(`User ${socket.id} left channel ${channelId}`);
        
        // チャンネルから退出したことを他のユーザーに通知
        socket.to(channelId).emit('userLeft', {
          userId: socket.id,
          timestamp: new Date().toISOString()
        });
      });

      // チャンネルの履歴を取得
      socket.on('getChannelHistory', ({ channelId }) => {
        console.log(`User ${socket.id} requested history for channel ${channelId}`);
        
        // チャンネルの履歴を送信（存在しない場合は空配列）
        const history = channelMessages[channelId] || [];
        socket.emit('channelHistory', history);
      });

      // メッセージ送信
      socket.on('sendMessage', (data) => {
        try {
          const { channelId, message, sender } = data;
          console.log(`Message in ${channelId} from ${sender}: ${message}`);
          
          // メッセージにIDとタイムスタンプを追加
          const messageWithId = {
            ...data,
            id: uuidv4(), // 一意のIDを生成
            timestamp: data.timestamp || new Date().toISOString()
          };
          
          // チャンネルのメッセージ履歴を更新
          if (!channelMessages[channelId]) {
            channelMessages[channelId] = [];
          }
          
          // 履歴に追加
          channelMessages[channelId].push(messageWithId);
          
          // 最大履歴数を超えた場合、古いメッセージを削除
          if (channelMessages[channelId].length > MAX_HISTORY) {
            channelMessages[channelId] = channelMessages[channelId].slice(-MAX_HISTORY);
          }
          
          // 同じチャンネルの他のユーザーにメッセージをブロードキャスト
          io.to(channelId).emit('newMessage', messageWithId);
        } catch (error) {
          console.error('Error processing message:', error);
          socket.emit('error', { message: 'メッセージの処理中にエラーが発生しました' });
        }
      });

      // タイピング中の通知
      socket.on('typing', (data) => {
        try {
          const { channelId, username } = data;
          // 送信者以外のチャンネルメンバーに通知
          socket.to(channelId).emit('userTyping', { username });
        } catch (error) {
          console.error('Error processing typing notification:', error);
        }
      });

      // エラーハンドリング
      socket.on('error', (error) => {
        console.error('Socket error:', error);
      });

      // 切断時の処理
      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });

    // WebSocketサーバーをHTTPサーバーにアタッチ
    httpServer.io = io;
  } else {
    // 既存のSocket.ioインスタンスを使用
    io = httpServer.io;
    console.log('Socket.io reused');
  }

  console.log('Socket.io initialized');
  res.end();
} 