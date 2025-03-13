package services

import (
	"database/sql"
	"fmt"
	"mime/multipart"
	"path/filepath"

	"app/models"
)

// MessageService handles message-related business logic
// This service is maintained for backward compatibility during migration
// It will be deprecated after migration is complete
type MessageService struct {
	DB                    *sql.DB
	channelMessageService *ChannelMessageService
}

// NewMessageService creates a new message service
func NewMessageService(db *sql.DB) *MessageService {
	return &MessageService{
		DB:                    db,
		channelMessageService: NewChannelMessageService(db),
	}
}

// SaveMessage saves a message to the database
// This method now delegates to the appropriate service based on the message type
func (s *MessageService) SaveMessage(message models.Message) error {
	// Convert to channel message and use the channel message service
	channelMessage := models.ChannelMessage{
		ID:        message.ID,
		ChannelId: message.ChannelId,
		UserId:    message.UserId,
		Content:   message.Content,
		Timestamp: message.Timestamp,
		IsEdited:  message.IsEdited,
		IsDeleted: message.IsDeleted,
		EditedAt:  message.EditedAt,
	}
	return s.channelMessageService.SaveChannelMessage(channelMessage)
}

// GetChannelMessages retrieves all messages for a specific channel
func (s *MessageService) GetChannelMessages(channelId string) ([]models.Message, error) {
	// Delegate to the channel message service and convert the result
	channelMessages, err := s.channelMessageService.GetChannelMessages(channelId)
	if err != nil {
		return nil, err
	}

	// Convert channel messages to legacy message format
	var messages []models.Message
	for _, cm := range channelMessages {
		message := models.Message{
			ID:        cm.ID,
			Content:   cm.Content,
			ChannelId: cm.ChannelId,
			UserId:    cm.UserId,
			Timestamp: cm.Timestamp,
			IsEdited:  cm.IsEdited,
			IsDeleted: cm.IsDeleted,
			EditedAt:  cm.EditedAt,
			// Role is not used for channel messages
		}
		messages = append(messages, message)
	}

	return messages, nil
}

// IsMessageAuthor checks if the user is the author of the message
func (s *MessageService) IsMessageAuthor(messageId, userId string) (bool, error) {
	return s.channelMessageService.IsMessageAuthor(messageId, userId)
}

// CanDeleteMessage checks if a user can delete a message
func (s *MessageService) CanDeleteMessage(messageId, userId string) (bool, error) {
	// Check if user is the author
	isAuthor, err := s.IsMessageAuthor(messageId, userId)
	if err != nil {
		return false, err
	}
	if isAuthor {
		return true, nil
	}

	// If not the author, check if user is an admin or owner of the server
	var channelId string
	err = s.DB.QueryRow(
		"SELECT channel_id FROM channel_messages WHERE id = $1",
		messageId,
	).Scan(&channelId)
	if err != nil {
		return false, err
	}

	var serverId string
	err = s.DB.QueryRow(
		"SELECT server_id FROM channels WHERE id = $1",
		channelId,
	).Scan(&serverId)
	if err != nil {
		return false, err
	}

	var role string
	err = s.DB.QueryRow(
		"SELECT role FROM server_members WHERE server_id = $1 AND user_id = $2",
		serverId, userId,
	).Scan(&role)
	if err != nil {
		if err == sql.ErrNoRows {
			return false, nil
		}
		return false, err
	}

	return role == "owner" || role == "admin", nil
}

// EditMessage edits a message
func (s *MessageService) EditMessage(messageId, content string) error {
	return s.channelMessageService.EditChannelMessage(messageId, content)
}

// DeleteMessage marks a message as deleted
func (s *MessageService) DeleteMessage(messageId string) error {
	return s.channelMessageService.DeleteChannelMessage(messageId)
}

// SaveAttachment saves a file attachment
func (s *MessageService) SaveAttachment(file *multipart.FileHeader, messageId string) (string, error) {
	return s.channelMessageService.SaveChannelAttachment(file, messageId)
}

// GetAttachment retrieves attachment information
func (s *MessageService) GetAttachment(attachmentId string) (models.Attachment, error) {
	// Get channel attachment and convert to legacy format
	channelAttachment, err := s.channelMessageService.GetChannelAttachment(attachmentId)
	if err != nil {
		return models.Attachment{}, err
	}

	// Convert to legacy attachment format
	attachment := models.Attachment{
		ID:         channelAttachment.ID,
		MessageId:  channelAttachment.MessageId,
		FileName:   channelAttachment.FileName,
		FileType:   channelAttachment.FileType,
		FilePath:   channelAttachment.FilePath,
		FileSize:   channelAttachment.FileSize,
		UploadedAt: channelAttachment.UploadedAt,
	}

	return attachment, nil
}

// Helper function to determine file type based on extension
func getFileType(fileName string) string {
	ext := filepath.Ext(fileName)
	switch ext {
	case ".jpg", ".jpeg", ".png", ".gif", ".webp":
		return "image"
	case ".mp4", ".webm", ".mov":
		return "video"
	case ".mp3", ".wav", ".ogg":
		return "audio"
	case ".pdf":
		return "pdf"
	case ".doc", ".docx":
		return "document"
	case ".xls", ".xlsx":
		return "spreadsheet"
	case ".ppt", ".pptx":
		return "presentation"
	default:
		return "other"
	}
}

// GetMessageByID gets a message by ID
func (s *MessageService) GetMessageByID(messageID string) (*models.Message, error) {
	query := `
		SELECT id, channel_id, user_id, content, is_edited, is_deleted
		FROM messages
		WHERE id = $1
	`

	var message models.Message
	err := s.DB.QueryRow(query, messageID).Scan(
		&message.ID,
		&message.ChannelId,
		&message.UserId,
		&message.Content,
		&message.IsEdited,
		&message.IsDeleted,
	)

	if err != nil {
		return nil, fmt.Errorf("メッセージの取得に失敗しました: %w", err)
	}

	// 添付ファイルを取得
	attachmentsQuery := `
		SELECT id, file_path, file_name, file_type, file_size
		FROM attachments
		WHERE message_id = $1
	`

	rows, err := s.DB.Query(attachmentsQuery, messageID)
	if err != nil {
		return nil, fmt.Errorf("添付ファイルの取得に失敗しました: %w", err)
	}
	defer rows.Close()

	var attachments []string
	for rows.Next() {
		var id, filePath, fileName, fileType string
		var fileSize int64
		if err := rows.Scan(&id, &filePath, &fileName, &fileType, &fileSize); err != nil {
			return nil, fmt.Errorf("添付ファイルの読み込みに失敗しました: %w", err)
		}
		attachments = append(attachments, filePath)
	}

	message.Attachments = attachments

	return &message, nil
}
