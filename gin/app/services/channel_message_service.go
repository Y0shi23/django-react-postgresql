package services

import (
	"database/sql"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"time"

	"github.com/google/uuid"

	"app/models"
)

// ChannelMessageService handles channel message operations
type ChannelMessageService struct {
	DB *sql.DB
}

// NewChannelMessageService creates a new ChannelMessageService
func NewChannelMessageService(db *sql.DB) *ChannelMessageService {
	return &ChannelMessageService{
		DB: db,
	}
}

// SaveChannelMessage saves a channel message to the database
func (s *ChannelMessageService) SaveChannelMessage(message models.ChannelMessage) error {
	tx, err := s.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Insert message
	_, err = tx.Exec(
		`INSERT INTO channel_messages (id, content, channel_id, user_id, timestamp, is_edited, is_deleted) 
		 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		message.ID, message.Content, message.ChannelId, message.UserId,
		message.Timestamp, message.IsEdited, message.IsDeleted,
	)
	if err != nil {
		return err
	}

	return tx.Commit()
}

// GetChannelMessages retrieves all messages for a specific channel
func (s *ChannelMessageService) GetChannelMessages(channelId string) ([]models.ChannelMessageWithUser, error) {
	rows, err := s.DB.Query(`
		SELECT cm.id, cm.content, cm.channel_id, cm.user_id, cm.timestamp, 
		       cm.is_edited, cm.is_deleted, cm.edited_at, u.username
		FROM channel_messages cm
		JOIN users u ON cm.user_id = u.id
		WHERE cm.channel_id = $1 AND cm.is_deleted = false
		ORDER BY cm.timestamp ASC
	`, channelId)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var messages []models.ChannelMessageWithUser
	for rows.Next() {
		var message models.ChannelMessageWithUser
		var editedAt sql.NullTime

		err := rows.Scan(
			&message.ID, &message.Content, &message.ChannelId, &message.UserId,
			&message.Timestamp, &message.IsEdited, &message.IsDeleted, &editedAt,
			&message.Username,
		)
		if err != nil {
			return nil, err
		}

		if editedAt.Valid {
			message.EditedAt = editedAt.Time
		}

		messages = append(messages, message)
	}

	return messages, nil
}

// IsMessageAuthor checks if the user is the author of the message
func (s *ChannelMessageService) IsMessageAuthor(messageId, userId string) (bool, error) {
	var count int
	err := s.DB.QueryRow(`
		SELECT COUNT(*) FROM channel_messages 
		WHERE id = $1 AND user_id = $2
	`, messageId, userId).Scan(&count)

	if err != nil {
		return false, err
	}

	return count > 0, nil
}

// EditChannelMessage edits a channel message
func (s *ChannelMessageService) EditChannelMessage(messageId, content string) error {
	_, err := s.DB.Exec(`
		UPDATE channel_messages 
		SET content = $1, is_edited = true, edited_at = $2
		WHERE id = $3
	`, content, time.Now(), messageId)

	return err
}

// DeleteChannelMessage marks a channel message as deleted
func (s *ChannelMessageService) DeleteChannelMessage(messageId string) error {
	_, err := s.DB.Exec(`
		UPDATE channel_messages 
		SET is_deleted = true
		WHERE id = $1
	`, messageId)

	return err
}

// SaveChannelAttachment saves a file attachment for a channel message
func (s *ChannelMessageService) SaveChannelAttachment(file *multipart.FileHeader, messageId string) (string, error) {
	// Create uploads directory if it doesn't exist
	uploadsDir := "./uploads/channel_attachments"
	if err := os.MkdirAll(uploadsDir, 0755); err != nil {
		return "", fmt.Errorf("failed to create uploads directory: %v", err)
	}

	// Generate a unique ID for the attachment
	attachmentId := uuid.New().String()

	// Get the file extension
	fileExt := filepath.Ext(file.Filename)

	// Create a unique filename
	filename := fmt.Sprintf("%s%s", attachmentId, fileExt)
	filePath := filepath.Join(uploadsDir, filename)

	// Open the source file
	src, err := file.Open()
	if err != nil {
		return "", fmt.Errorf("failed to open uploaded file: %v", err)
	}
	defer src.Close()

	// Create the destination file
	dst, err := os.Create(filePath)
	if err != nil {
		return "", fmt.Errorf("failed to create destination file: %v", err)
	}
	defer dst.Close()

	// Copy the file content
	if _, err = io.Copy(dst, src); err != nil {
		return "", fmt.Errorf("failed to copy file content: %v", err)
	}

	// Save attachment info to database
	_, err = s.DB.Exec(`
		INSERT INTO channel_attachments (id, message_id, file_name, file_type, file_path, file_size, uploaded_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`, attachmentId, messageId, file.Filename, getFileType(file.Filename), filePath, file.Size, time.Now())

	if err != nil {
		// Clean up the file if database insert fails
		os.Remove(filePath)
		return "", fmt.Errorf("failed to save attachment to database: %v", err)
	}

	return attachmentId, nil
}

// GetChannelAttachment retrieves attachment information
func (s *ChannelMessageService) GetChannelAttachment(attachmentId string) (models.ChannelAttachment, error) {
	var attachment models.ChannelAttachment

	err := s.DB.QueryRow(`
		SELECT id, message_id, file_name, file_type, file_path, file_size, uploaded_at
		FROM channel_attachments
		WHERE id = $1
	`, attachmentId).Scan(
		&attachment.ID, &attachment.MessageId, &attachment.FileName,
		&attachment.FileType, &attachment.FilePath, &attachment.FileSize,
		&attachment.UploadedAt,
	)

	return attachment, err
}

// GetChannelMessageAttachments retrieves all attachments for a message
func (s *ChannelMessageService) GetChannelMessageAttachments(messageId string) ([]models.ChannelAttachment, error) {
	rows, err := s.DB.Query(`
		SELECT id, message_id, file_name, file_type, file_path, file_size, uploaded_at
		FROM channel_attachments
		WHERE message_id = $1
	`, messageId)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var attachments []models.ChannelAttachment
	for rows.Next() {
		var attachment models.ChannelAttachment
		err := rows.Scan(
			&attachment.ID, &attachment.MessageId, &attachment.FileName,
			&attachment.FileType, &attachment.FilePath, &attachment.FileSize,
			&attachment.UploadedAt,
		)
		if err != nil {
			return nil, err
		}
		attachments = append(attachments, attachment)
	}

	return attachments, nil
}

// GetMessageByID gets a message by ID
func (s *ChannelMessageService) GetMessageByID(messageID string) (*models.ChannelMessage, error) {
	query := `
		SELECT id, channel_id, user_id, content, is_edited, is_deleted
		FROM channel_messages
		WHERE id = $1
	`

	var message models.ChannelMessage
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
		FROM channel_attachments
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
