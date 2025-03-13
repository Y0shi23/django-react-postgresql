// 主なビジネスロジックを実装：
// データベース操作
// OpenAI APIとの連携
// チャットの作成・取得・メッセージ追加の処理
// 特筆すべき機能：
// トランザクション管理
// OpenAI GPT-3.5-turboを使用した応答生成
// システムプロンプトとして日本語アシスタントの設定
package services

import (
	"app/models"
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/sashabaranov/go-openai"
)

// チャットのビジネスロジックを管理するサービス
type ChatService struct {
	db           *sql.DB        // データベース接続
	openAIClient *openai.Client // OpenAI APIクライアント
}

// 新しいChatServiceを作成
func NewChatService(db *sql.DB, openAIClient *openai.Client) *ChatService {
	return &ChatService{
		db:           db,
		openAIClient: openAIClient,
	}
}

func (s *ChatService) CreateNewChat(message string, userID string) (string, []models.ChatbotMessage, error) {
	tx, err := s.db.Begin()
	if err != nil {
		return "", nil, fmt.Errorf("failed to begin transaction: %v", err)
	}
	defer tx.Rollback()

	chatID := uuid.New().String()
	// タイトルを安全に生成
	title := ""
	if len(message) > 30 {
		// UTF-8文字列を正しく処理
		runes := []rune(message)
		if len(runes) > 30 {
			title = string(runes[:30]) + "..."
		} else {
			title = message
		}
	} else {
		title = message
	}

	// チャットを作成
	_, err = tx.Exec(
		"INSERT INTO chats (id, created_at, title, user_id) VALUES ($1, $2, $3, $4)",
		chatID, time.Now(), title, userID,
	)
	if err != nil {
		return "", nil, fmt.Errorf("failed to create chat: %v", err)
	}

	// ユーザーメッセージを追加
	userMessageID := uuid.New().String()
	_, err = tx.Exec(
		"INSERT INTO chatbot_messages (id, chat_id, content, role, timestamp) VALUES ($1, $2, $3, $4, $5)",
		userMessageID, chatID, message, "user", time.Now(),
	)
	if err != nil {
		return "", nil, fmt.Errorf("failed to add user message: %v", err)
	}

	// OpenAIからの応答を生成
	messages := []models.ChatbotMessage{
		{
			ID:        userMessageID,
			ChatId:    chatID,
			Content:   message,
			Role:      "user",
			Timestamp: time.Now(),
		},
	}

	// OpenAIからの応答を生成
	response, err := s.generateOpenAIResponse(messages)
	if err != nil {
		return "", nil, fmt.Errorf("failed to generate AI response: %v", err)
	}

	// AIの応答をデータベースに保存
	aiMessageID := uuid.New().String()
	_, err = tx.Exec(
		"INSERT INTO chatbot_messages (id, chat_id, content, role, timestamp) VALUES ($1, $2, $3, $4, $5)",
		aiMessageID, chatID, response, "assistant", time.Now(),
	)
	if err != nil {
		return "", nil, fmt.Errorf("failed to add AI response: %v", err)
	}

	// AIの応答をメッセージリストに追加
	messages = append(messages, models.ChatbotMessage{
		ID:        aiMessageID,
		ChatId:    chatID,
		Content:   response,
		Role:      "assistant",
		Timestamp: time.Now(),
	})

	// トランザクションをコミット
	if err = tx.Commit(); err != nil {
		return "", nil, fmt.Errorf("failed to commit transaction: %v", err)
	}

	return chatID, messages, nil
}

func (s *ChatService) GetChat(chatID string, userID string) (*models.Chat, bool) {
	// チャットの所有者を確認
	var ownerID string
	err := s.db.QueryRow("SELECT user_id FROM chats WHERE id = $1", chatID).Scan(&ownerID)
	if err != nil {
		return nil, false
	}

	// ユーザーIDが一致するか確認
	if ownerID != userID {
		return nil, false
	}

	// チャットメッセージを取得
	rows, err := s.db.Query(
		"SELECT id, content, role, timestamp FROM chatbot_messages WHERE chat_id = $1 ORDER BY timestamp ASC",
		chatID,
	)
	if err != nil {
		return nil, false
	}
	defer rows.Close()

	var messages []models.ChatbotMessage
	for rows.Next() {
		var msg models.ChatbotMessage
		err := rows.Scan(&msg.ID, &msg.Content, &msg.Role, &msg.Timestamp)
		if err != nil {
			return nil, false
		}
		msg.ChatId = chatID
		messages = append(messages, msg)
	}

	return &models.Chat{
		ID:       chatID,
		Messages: messages,
	}, true
}

func (s *ChatService) AddMessage(chatID string, message string, userID string) (*models.ChatbotMessage, error) {
	// チャットの所有者を確認
	var ownerID string
	err := s.db.QueryRow("SELECT user_id FROM chats WHERE id = $1", chatID).Scan(&ownerID)
	if err != nil {
		return nil, fmt.Errorf("chat not found: %v", err)
	}

	// ユーザーIDが一致するか確認
	if ownerID != userID {
		return nil, fmt.Errorf("unauthorized access to chat")
	}

	tx, err := s.db.Begin()
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %v", err)
	}
	defer tx.Rollback()

	// ユーザーメッセージを追加
	userMessageID := uuid.New().String()
	_, err = tx.Exec(
		"INSERT INTO chatbot_messages (id, chat_id, content, role, timestamp) VALUES ($1, $2, $3, $4, $5)",
		userMessageID, chatID, message, "user", time.Now(),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to add user message: %v", err)
	}

	// チャットの最終更新時間を更新
	_, err = tx.Exec(
		"UPDATE chats SET last_message_at = $1 WHERE id = $2",
		time.Now(), chatID,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to update chat: %v", err)
	}

	// これまでのメッセージを取得
	rows, err := tx.Query(
		"SELECT id, content, role, timestamp FROM chatbot_messages WHERE chat_id = $1 ORDER BY timestamp ASC",
		chatID,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get chat messages: %v", err)
	}

	var messages []models.ChatbotMessage
	for rows.Next() {
		var msg models.ChatbotMessage
		err := rows.Scan(&msg.ID, &msg.Content, &msg.Role, &msg.Timestamp)
		if err != nil {
			rows.Close()
			return nil, fmt.Errorf("failed to scan message: %v", err)
		}
		msg.ChatId = chatID
		messages = append(messages, msg)
	}
	rows.Close()

	// OpenAIからの応答を生成
	response, err := s.generateOpenAIResponse(messages)
	if err != nil {
		return nil, fmt.Errorf("failed to generate AI response: %v", err)
	}

	// AIの応答をデータベースに保存
	aiMessageID := uuid.New().String()
	_, err = tx.Exec(
		"INSERT INTO chatbot_messages (id, chat_id, content, role, timestamp) VALUES ($1, $2, $3, $4, $5)",
		aiMessageID, chatID, response, "assistant", time.Now(),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to add AI response: %v", err)
	}

	// トランザクションをコミット
	if err = tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %v", err)
	}

	// AIの応答を返す
	return &models.ChatbotMessage{
		ID:        aiMessageID,
		ChatId:    chatID,
		Content:   response,
		Role:      "assistant",
		Timestamp: time.Now(),
	}, nil
}

func (s *ChatService) generateOpenAIResponse(messages []models.ChatbotMessage) (string, error) {
	// OpenAIのメッセージフォーマットに変換
	openaiMessages := []openai.ChatCompletionMessage{
		{
			Role:    "system",
			Content: "あなたは親切で丁寧な日本語アシスタントです。ユーザーの質問に対して、簡潔かつ正確に回答してください。",
		},
	}

	for _, msg := range messages {
		openaiMessages = append(openaiMessages, openai.ChatCompletionMessage{
			Role:    msg.Role,
			Content: msg.Content,
		})
	}

	// OpenAI APIリクエストを作成
	resp, err := s.openAIClient.CreateChatCompletion(
		context.Background(),
		openai.ChatCompletionRequest{
			Model:    "gpt-3.5-turbo",
			Messages: openaiMessages,
		},
	)

	if err != nil {
		return "", fmt.Errorf("OpenAI API error: %v", err)
	}

	if len(resp.Choices) == 0 {
		return "", fmt.Errorf("no response from OpenAI")
	}

	return resp.Choices[0].Message.Content, nil
}

func (s *ChatService) GetChatHistory(userID string) ([]models.ChatSummary, error) {
	rows, err := s.db.Query(`
		SELECT c.id, c.created_at, c.title, COALESCE(c.last_message_at, c.created_at) as last_message_at,
		       (SELECT COUNT(*) FROM chatbot_messages WHERE chat_id = c.id) as message_count,
		       (SELECT content FROM chatbot_messages WHERE chat_id = c.id ORDER BY timestamp ASC LIMIT 1) as first_message
		FROM chats c
		WHERE c.user_id = $1
		ORDER BY COALESCE(c.last_message_at, c.created_at) DESC
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get chat history: %v", err)
	}
	defer rows.Close()

	var chats []models.ChatSummary
	for rows.Next() {
		var chat models.ChatSummary
		err := rows.Scan(
			&chat.ID, &chat.CreatedAt, &chat.Title, &chat.LastMessageAt,
			&chat.MessageCount, &chat.FirstMessage,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan chat: %v", err)
		}
		chats = append(chats, chat)
	}

	return chats, nil
}

// チャットメッセージを編集する
func (s *ChatService) EditChatMessage(messageId, content string, userId string) error {
	// まず、メッセージが存在するか、そしてユーザーがそのメッセージの所有者かを確認
	var chatId, messageUserId string
	err := s.db.QueryRow(
		"SELECT chat_id, user_id FROM chatbot_messages WHERE id = $1 AND role = 'user'",
		messageId,
	).Scan(&chatId, &messageUserId)

	if err != nil {
		if err == sql.ErrNoRows {
			return fmt.Errorf("message not found or not editable")
		}
		return fmt.Errorf("failed to get message: %v", err)
	}

	// ユーザーIDが一致するか確認
	if messageUserId != userId {
		return fmt.Errorf("unauthorized: you can only edit your own messages")
	}

	// チャットの所有者を確認
	var chatOwnerId string
	err = s.db.QueryRow("SELECT user_id FROM chats WHERE id = $1", chatId).Scan(&chatOwnerId)
	if err != nil {
		return fmt.Errorf("failed to get chat: %v", err)
	}

	// チャットの所有者とユーザーIDが一致するか確認
	if chatOwnerId != userId {
		return fmt.Errorf("unauthorized: you can only edit messages in your own chats")
	}

	// トランザクション開始
	tx, err := s.db.Begin()
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %v", err)
	}
	defer tx.Rollback()

	// メッセージを更新
	_, err = tx.Exec(
		"UPDATE chatbot_messages SET content = $1, is_edited = true, edited_at = $2 WHERE id = $3",
		content, time.Now(), messageId,
	)
	if err != nil {
		return fmt.Errorf("failed to update message: %v", err)
	}

	// トランザクションをコミット
	if err = tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit transaction: %v", err)
	}

	return nil
}

// チャットメッセージを削除する（論理削除）
func (s *ChatService) DeleteChatMessage(messageId string, userId string) error {
	// まず、メッセージが存在するか、そしてユーザーがそのメッセージの所有者かを確認
	var chatId, messageUserId string
	err := s.db.QueryRow(
		"SELECT chat_id, user_id FROM chatbot_messages WHERE id = $1 AND role = 'user'",
		messageId,
	).Scan(&chatId, &messageUserId)

	if err != nil {
		if err == sql.ErrNoRows {
			return fmt.Errorf("message not found or not deletable")
		}
		return fmt.Errorf("failed to get message: %v", err)
	}

	// ユーザーIDが一致するか確認
	if messageUserId != userId {
		return fmt.Errorf("unauthorized: you can only delete your own messages")
	}

	// チャットの所有者を確認
	var chatOwnerId string
	err = s.db.QueryRow("SELECT user_id FROM chats WHERE id = $1", chatId).Scan(&chatOwnerId)
	if err != nil {
		return fmt.Errorf("failed to get chat: %v", err)
	}

	// チャットの所有者とユーザーIDが一致するか確認
	if chatOwnerId != userId {
		return fmt.Errorf("unauthorized: you can only delete messages in your own chats")
	}

	// トランザクション開始
	tx, err := s.db.Begin()
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %v", err)
	}
	defer tx.Rollback()

	// メッセージを論理削除
	_, err = tx.Exec(
		"UPDATE chatbot_messages SET is_deleted = true WHERE id = $1",
		messageId,
	)
	if err != nil {
		return fmt.Errorf("failed to delete message: %v", err)
	}

	// トランザクションをコミット
	if err = tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit transaction: %v", err)
	}

	return nil
}
