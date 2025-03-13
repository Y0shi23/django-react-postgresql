package models

import (
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

// WebSocketClient はWebSocket接続クライアントを表す構造体
type WebSocketClient struct {
	ID        string
	Conn      *websocket.Conn
	UserID    string
	ChannelID string
	Send      chan []byte
}

// WebSocketMessage はWebSocketを通じて送受信されるメッセージの構造体
type WebSocketMessage struct {
	Type      string      `json:"type"`                // メッセージタイプ: "message", "message_update", "message_delete"
	Message   interface{} `json:"message,omitempty"`   // メッセージ本体（新規または更新）
	MessageID string      `json:"messageId,omitempty"` // メッセージID（削除時に使用）
	Timestamp time.Time   `json:"timestamp"`           // タイムスタンプ
}

// WebSocketHub はWebSocket接続を管理するハブ
type WebSocketHub struct {
	// チャンネルIDごとのクライアントマップ
	Channels map[string]map[string]*WebSocketClient
	// クライアントの登録チャネル
	Register chan *WebSocketClient
	// クライアントの登録解除チャネル
	Unregister chan *WebSocketClient
	// チャンネルへのブロードキャストチャネル
	Broadcast chan *ChannelBroadcast
	// ミューテックス
	Mutex sync.RWMutex
}

// ChannelBroadcast はチャンネルへのブロードキャストを表す構造体
type ChannelBroadcast struct {
	ChannelID string
	Message   []byte
}

// NewWebSocketHub は新しいWebSocketHubを作成する
func NewWebSocketHub() *WebSocketHub {
	return &WebSocketHub{
		Channels:   make(map[string]map[string]*WebSocketClient),
		Register:   make(chan *WebSocketClient),
		Unregister: make(chan *WebSocketClient),
		Broadcast:  make(chan *ChannelBroadcast),
		Mutex:      sync.RWMutex{},
	}
}
