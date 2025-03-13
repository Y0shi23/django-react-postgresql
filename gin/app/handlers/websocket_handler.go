package handlers

import (
	"app/models"
	"app/services"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

const (
	// 書き込みのタイムアウト
	writeWait = 10 * time.Second

	// pingの間隔
	pingPeriod = 60 * time.Second

	// 読み取りのタイムアウト
	pongWait = 70 * time.Second

	// メッセージの最大サイズ
	maxMessageSize = 512 * 1024 // 512KB
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	// クロスオリジン要求を許可する（開発環境用）
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

// WebSocketHandler はWebSocket接続を処理するハンドラー
type WebSocketHandler struct {
	wsService     *services.WebSocketService
	userService   *services.UserService
	serverService *services.ServerService
}

// NewWebSocketHandler は新しいWebSocketHandlerを作成する
func NewWebSocketHandler(wsService *services.WebSocketService, userService *services.UserService, serverService *services.ServerService) *WebSocketHandler {
	return &WebSocketHandler{
		wsService:     wsService,
		userService:   userService,
		serverService: serverService,
	}
}

// HandleWebSocket はWebSocket接続をハンドルする
func (h *WebSocketHandler) HandleWebSocket(c *gin.Context) {
	// チャンネルIDを取得
	channelID := c.Param("channelId")
	if channelID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "チャンネルIDが指定されていません"})
		return
	}

	// トークンを取得して認証
	token := c.Query("token")
	if token == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "認証トークンが指定されていません"})
		return
	}

	// トークンを検証
	userID, err := h.userService.ValidateToken(token)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "無効な認証トークンです"})
		return
	}

	// チャンネルの存在確認とアクセス権限の確認
	hasAccess, err := h.serverService.UserHasChannelAccess(userID, channelID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "チャンネルアクセスの確認中にエラーが発生しました"})
		return
	}
	if !hasAccess {
		c.JSON(http.StatusForbidden, gin.H{"error": "このチャンネルにアクセスする権限がありません"})
		return
	}

	// WebSocketにアップグレード
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("WebSocketへのアップグレードに失敗: %v", err)
		return
	}

	// クライアントを作成
	client := &models.WebSocketClient{
		ID:        h.wsService.GenerateClientID(),
		Conn:      conn,
		UserID:    userID,
		ChannelID: channelID,
		Send:      make(chan []byte, 256),
	}

	// クライアントを登録
	h.wsService.Hub.Register <- client

	// 接続情報をログに出力
	log.Printf("WebSocket接続が確立されました: ユーザーID=%s, チャンネルID=%s, クライアントID=%s", userID, channelID, client.ID)

	// 読み取りと書き込みのゴルーチンを開始
	go h.readPump(client)
	go h.writePump(client)
}

// readPump はクライアントからのメッセージを読み取るポンプ
func (h *WebSocketHandler) readPump(client *models.WebSocketClient) {
	defer func() {
		h.wsService.Hub.Unregister <- client
		client.Conn.Close()
	}()

	client.Conn.SetReadLimit(maxMessageSize)
	client.Conn.SetReadDeadline(time.Now().Add(pongWait))
	client.Conn.SetPongHandler(func(string) error {
		client.Conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, _, err := client.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket読み取りエラー: %v", err)
			}
			break
		}
		// クライアントからのメッセージは現在処理していない
		// 将来的にはここでメッセージを処理する
	}
}

// writePump はクライアントへのメッセージを書き込むポンプ
func (h *WebSocketHandler) writePump(client *models.WebSocketClient) {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		client.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-client.Send:
			client.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// チャネルが閉じられた
				client.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := client.Conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// キューに溜まっているメッセージも送信
			n := len(client.Send)
			for i := 0; i < n; i++ {
				w.Write(<-client.Send)
			}

			if err := w.Close(); err != nil {
				return
			}
		case <-ticker.C:
			client.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := client.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
