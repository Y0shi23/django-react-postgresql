package services

import (
	"app/models"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
)

// WebSocketService はWebSocket接続を管理するサービス
type WebSocketService struct {
	Hub *models.WebSocketHub
}

// NewWebSocketService は新しいWebSocketServiceを作成する
func NewWebSocketService() *WebSocketService {
	hub := models.NewWebSocketHub()
	go runHub(hub)
	return &WebSocketService{
		Hub: hub,
	}
}

// runHub はWebSocketHubを実行する
func runHub(hub *models.WebSocketHub) {
	for {
		select {
		case client := <-hub.Register:
			registerClient(hub, client)
		case client := <-hub.Unregister:
			unregisterClient(hub, client)
		case broadcast := <-hub.Broadcast:
			broadcastToChannel(hub, broadcast)
		}
	}
}

// registerClient はクライアントを登録する
func registerClient(hub *models.WebSocketHub, client *models.WebSocketClient) {
	hub.Mutex.Lock()
	defer hub.Mutex.Unlock()

	// チャンネルが存在しない場合は作成
	if _, ok := hub.Channels[client.ChannelID]; !ok {
		hub.Channels[client.ChannelID] = make(map[string]*models.WebSocketClient)
	}

	// クライアントをチャンネルに追加
	hub.Channels[client.ChannelID][client.ID] = client
	log.Printf("クライアント %s がチャンネル %s に接続しました", client.ID, client.ChannelID)
}

// unregisterClient はクライアントの登録を解除する
func unregisterClient(hub *models.WebSocketHub, client *models.WebSocketClient) {
	hub.Mutex.Lock()
	defer hub.Mutex.Unlock()

	// チャンネルが存在する場合
	if _, ok := hub.Channels[client.ChannelID]; ok {
		// クライアントが存在する場合は削除
		if _, ok := hub.Channels[client.ChannelID][client.ID]; ok {
			delete(hub.Channels[client.ChannelID], client.ID)
			close(client.Send)
			log.Printf("クライアント %s がチャンネル %s から切断しました", client.ID, client.ChannelID)
		}

		// チャンネルが空になった場合は削除
		if len(hub.Channels[client.ChannelID]) == 0 {
			delete(hub.Channels, client.ChannelID)
			log.Printf("チャンネル %s が空になったため削除しました", client.ChannelID)
		}
	}
}

// broadcastToChannel はチャンネルにメッセージをブロードキャストする
func broadcastToChannel(hub *models.WebSocketHub, broadcast *models.ChannelBroadcast) {
	hub.Mutex.RLock()
	defer hub.Mutex.RUnlock()

	// チャンネルが存在する場合
	if clients, ok := hub.Channels[broadcast.ChannelID]; ok {
		for _, client := range clients {
			select {
			case client.Send <- broadcast.Message:
				// メッセージを送信
			default:
				// 送信に失敗した場合はクライアントを削除
				close(client.Send)
				hub.Mutex.RUnlock()
				hub.Mutex.Lock()
				delete(hub.Channels[broadcast.ChannelID], client.ID)
				if len(hub.Channels[broadcast.ChannelID]) == 0 {
					delete(hub.Channels, broadcast.ChannelID)
				}
				hub.Mutex.Unlock()
				hub.Mutex.RLock()
			}
		}
	}
}

// BroadcastNewMessage は新しいメッセージをブロードキャストする
func (s *WebSocketService) BroadcastNewMessage(channelID string, message interface{}) error {
	wsMessage := models.WebSocketMessage{
		Type:      "message",
		Message:   message,
		Timestamp: time.Now(),
	}

	return s.broadcastMessage(channelID, wsMessage)
}

// BroadcastMessageUpdate はメッセージの更新をブロードキャストする
func (s *WebSocketService) BroadcastMessageUpdate(channelID string, message interface{}) error {
	wsMessage := models.WebSocketMessage{
		Type:      "message_update",
		Message:   message,
		Timestamp: time.Now(),
	}

	return s.broadcastMessage(channelID, wsMessage)
}

// BroadcastMessageDelete はメッセージの削除をブロードキャストする
func (s *WebSocketService) BroadcastMessageDelete(channelID string, messageID string) error {
	wsMessage := models.WebSocketMessage{
		Type:      "message_delete",
		MessageID: messageID,
		Timestamp: time.Now(),
	}

	return s.broadcastMessage(channelID, wsMessage)
}

// broadcastMessage はメッセージをブロードキャストする
func (s *WebSocketService) broadcastMessage(channelID string, message models.WebSocketMessage) error {
	// メッセージをJSONに変換
	messageBytes, err := json.Marshal(message)
	if err != nil {
		return fmt.Errorf("メッセージのJSONへの変換に失敗しました: %w", err)
	}

	// ブロードキャスト
	s.Hub.Broadcast <- &models.ChannelBroadcast{
		ChannelID: channelID,
		Message:   messageBytes,
	}

	return nil
}

// GenerateClientID はクライアントIDを生成する
func (s *WebSocketService) GenerateClientID() string {
	return uuid.New().String()
}

// GetChannelClientsCount はチャンネルのクライアント数を取得する
func (s *WebSocketService) GetChannelClientsCount(channelID string) int {
	s.Hub.Mutex.RLock()
	defer s.Hub.Mutex.RUnlock()

	if clients, ok := s.Hub.Channels[channelID]; ok {
		return len(clients)
	}
	return 0
}

// GetTotalClientsCount は全クライアント数を取得する
func (s *WebSocketService) GetTotalClientsCount() int {
	s.Hub.Mutex.RLock()
	defer s.Hub.Mutex.RUnlock()

	count := 0
	for _, clients := range s.Hub.Channels {
		count += len(clients)
	}
	return count
}
