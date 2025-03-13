package models

import (
	"time"
)

// ChannelMessage represents a message in a server channel
type ChannelMessage struct {
	ID          string    `json:"id"`
	ChannelId   string    `json:"channelId"`
	UserId      string    `json:"userId"`
	Content     string    `json:"content"`
	Timestamp   time.Time `json:"timestamp"`
	IsEdited    bool      `json:"isEdited"`
	IsDeleted   bool      `json:"isDeleted"`
	EditedAt    time.Time `json:"editedAt,omitempty"`
	Attachments []string  `json:"attachments,omitempty"`
	// Attachments will be loaded separately
}

// ChannelMessageWithUser includes user information with the message
type ChannelMessageWithUser struct {
	ID          string    `json:"id"`
	ChannelId   string    `json:"channelId"`
	UserId      string    `json:"userId"`
	Username    string    `json:"username"`
	Content     string    `json:"content"`
	Timestamp   time.Time `json:"timestamp"`
	IsEdited    bool      `json:"isEdited"`
	IsDeleted   bool      `json:"isDeleted"`
	EditedAt    time.Time `json:"editedAt,omitempty"`
	Attachments []string  `json:"attachments,omitempty"`
}

// ChannelAttachment represents a file attachment for a channel message
type ChannelAttachment struct {
	ID         string    `json:"id"`
	MessageId  string    `json:"messageId"`
	FileName   string    `json:"fileName"`
	FileType   string    `json:"fileType"` // "image", "video", "document", etc.
	FilePath   string    `json:"filePath"`
	FileSize   int64     `json:"fileSize"`
	UploadedAt time.Time `json:"uploadedAt"`
}

// ChannelMessageRequest represents a request to create or edit a channel message
type ChannelMessageRequest struct {
	Content     string   `json:"content"`
	Attachments []string `json:"attachments,omitempty"`
}

// EditChannelMessageRequest represents a request to edit a channel message
type EditChannelMessageRequest struct {
	Content string `json:"content" binding:"required"`
}
