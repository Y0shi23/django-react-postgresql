// チャットとメッセージの基本的なデータ構造を定義しています。
package models

import (
	"time"
)

// チャットボットのメッセージを表す構造体
type ChatbotMessage struct {
	ID        string    `json:"id"`
	ChatId    string    `json:"chatId"`
	Content   string    `json:"content"`
	Role      string    `json:"role"`
	Timestamp time.Time `json:"timestamp"`
}

// チャットの構造体
type Chat struct {
	ID       string           `json:"id"`
	Messages []ChatbotMessage `json:"messages"`
}

// チャットのレスポンスを表す構造体
type ChatResponse struct {
	Message     string
	Suggestions []string
}

// チャット履歴の要約情報
type ChatSummary struct {
	ID            string    `json:"id"`
	CreatedAt     time.Time `json:"createdAt"`
	Title         string    `json:"title"`
	LastMessageAt time.Time `json:"lastMessageAt"`
	MessageCount  int       `json:"messageCount"`
	FirstMessage  string    `json:"firstMessage"`
}

// Legacy Message type for backward compatibility during migration
// This can be removed after migration is complete
type Message struct {
	ID          string    `json:"id"`
	Content     string    `json:"content"`
	Role        string    `json:"role"`
	Timestamp   time.Time `json:"timestamp"`
	ChatId      string    `json:"chatId,omitempty"`
	ChannelId   string    `json:"channelId,omitempty"`
	UserId      string    `json:"userId,omitempty"`
	Attachments []string  `json:"attachments,omitempty"`
	IsEdited    bool      `json:"isEdited"`
	IsDeleted   bool      `json:"isDeleted"`
	EditedAt    time.Time `json:"editedAt,omitempty"`
}

// Attachment represents a file attachment
type Attachment struct {
	ID         string    `json:"id"`
	MessageId  string    `json:"messageId"`
	FileName   string    `json:"fileName"`
	FileType   string    `json:"fileType"` // "image", "video", "document", etc.
	FilePath   string    `json:"filePath"`
	FileSize   int64     `json:"fileSize"`
	UploadedAt time.Time `json:"uploadedAt"`
}

// MessageRequest represents a request to create or edit a message
type MessageRequest struct {
	Content     string   `json:"content"`
	Attachments []string `json:"attachments,omitempty"`
}

// EditMessageRequest はメッセージ編集リクエストの構造体
type EditMessageRequest struct {
	Content string `json:"content" binding:"required"`
}
