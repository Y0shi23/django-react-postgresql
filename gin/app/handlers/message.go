package handlers

import (
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"app/models"
	"app/services"
)

// MessageHandler handles message-related requests
type MessageHandler struct {
	messageService *services.MessageService
	serverService  *services.ServerService
	wsService      *services.WebSocketService
}

// NewMessageHandler creates a new message handler
func NewMessageHandler(messageService *services.MessageService, serverService *services.ServerService) *MessageHandler {
	return &MessageHandler{
		messageService: messageService,
		serverService:  serverService,
	}
}

// SetWebSocketService はWebSocketServiceを設定する
func (h *MessageHandler) SetWebSocketService(wsService *services.WebSocketService) {
	h.wsService = wsService
}

// SendChannelMessage sends a message to a channel
func (h *MessageHandler) SendChannelMessage(c *gin.Context) {
	channelID := c.Param("id")
	if channelID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Channel ID is required"})
		return
	}

	// Get user ID from context
	userId, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Check if user is a member of the channel
	hasAccess, err := h.serverService.HasChannelAccess(channelID, userId.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if !hasAccess {
		c.JSON(http.StatusForbidden, gin.H{"error": "You are not a member of this channel"})
		return
	}

	// Parse request
	var req struct {
		Content string `json:"content" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Create message
	messageId := uuid.New().String()
	message := models.Message{
		ID:        messageId,
		ChannelId: channelID,
		UserId:    userId.(string),
		Content:   req.Content,
		Role:      "user",
		Timestamp: time.Now(),
	}

	// Handle file uploads if any
	var attachments []string
	form, err := c.MultipartForm()
	if err == nil && form.File != nil {
		files := form.File["files"]
		for _, file := range files {
			// Save file and get path
			filePath, err := h.messageService.SaveAttachment(file, messageId)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "ファイルのアップロードに失敗しました"})
				return
			}
			attachments = append(attachments, filePath)
		}
	}

	// Add attachments to message
	message.Attachments = attachments

	// Save message
	if err := h.messageService.SaveMessage(message); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// レスポンスを返す
	c.JSON(http.StatusCreated, gin.H{
		"message": message,
	})

	// WebSocketでブロードキャスト（WebSocketサービスが設定されている場合）
	if h.wsService != nil {
		if err := h.wsService.BroadcastNewMessage(channelID, message); err != nil {
			log.Printf("WebSocketブロードキャストエラー: %v", err)
		}
	}
}

// GetChannelMessages gets all messages in a channel
func (h *MessageHandler) GetChannelMessages(c *gin.Context) {
	channelID := c.Param("id")
	if channelID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Channel ID is required"})
		return
	}

	// Get user ID from context
	userId, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Check if user is a member of the channel
	hasAccess, err := h.serverService.HasChannelAccess(channelID, userId.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if !hasAccess {
		c.JSON(http.StatusForbidden, gin.H{"error": "You are not a member of this channel"})
		return
	}

	// Get messages
	messages, err := h.messageService.GetChannelMessages(channelID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// messagesがnilの場合は空の配列を返す
	if messages == nil {
		messages = []models.Message{}
	}

	c.JSON(http.StatusOK, gin.H{
		"messages": messages,
	})
}

// EditMessage edits a message
func (h *MessageHandler) EditMessage(c *gin.Context) {
	messageID := c.Param("id")
	if messageID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Message ID is required"})
		return
	}

	// Get user ID from context
	userId, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Check if user is the author of the message
	isAuthor, err := h.messageService.IsMessageAuthor(messageID, userId.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if !isAuthor {
		c.JSON(http.StatusForbidden, gin.H{"error": "You are not the author of this message"})
		return
	}

	// Parse request
	var req struct {
		Content string `json:"content" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Edit message
	if err := h.messageService.EditMessage(messageID, req.Content); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// メッセージのチャンネルIDを取得
	var channelID string
	err = h.messageService.DB.QueryRow("SELECT channel_id FROM messages WHERE id = $1", messageID).Scan(&channelID)
	if err != nil {
		log.Printf("メッセージのチャンネルID取得エラー: %v", err)
	}

	// レスポンスを返す
	c.JSON(http.StatusOK, gin.H{
		"message": "Message updated successfully",
	})

	// WebSocketでブロードキャスト（WebSocketサービスが設定されている場合）
	if h.wsService != nil && channelID != "" {
		// 更新されたメッセージを取得
		updatedMessage, err := h.messageService.GetMessageByID(messageID)
		if err != nil {
			log.Printf("更新されたメッセージの取得エラー: %v", err)
			return
		}

		if err := h.wsService.BroadcastMessageUpdate(channelID, updatedMessage); err != nil {
			log.Printf("WebSocketブロードキャストエラー: %v", err)
		}
	}
}

// DeleteMessage deletes a message
func (h *MessageHandler) DeleteMessage(c *gin.Context) {
	messageID := c.Param("id")
	if messageID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Message ID is required"})
		return
	}

	// Get user ID from context
	userId, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Check if user can delete the message
	canDelete, err := h.messageService.CanDeleteMessage(messageID, userId.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if !canDelete {
		c.JSON(http.StatusForbidden, gin.H{"error": "You don't have permission to delete this message"})
		return
	}

	// Delete message
	if err := h.messageService.DeleteMessage(messageID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// メッセージのチャンネルIDを取得
	var channelID string
	err = h.messageService.DB.QueryRow("SELECT channel_id FROM messages WHERE id = $1", messageID).Scan(&channelID)
	if err != nil {
		log.Printf("メッセージのチャンネルID取得エラー: %v", err)
	}

	// レスポンスを返す
	c.JSON(http.StatusOK, gin.H{
		"message": "Message deleted successfully",
	})

	// WebSocketでブロードキャスト（WebSocketサービスが設定されている場合）
	if h.wsService != nil && channelID != "" {
		if err := h.wsService.BroadcastMessageDelete(channelID, messageID); err != nil {
			log.Printf("WebSocketブロードキャストエラー: %v", err)
		}
	}
}

// GetAttachment gets an attachment
func (h *MessageHandler) GetAttachment(c *gin.Context) {
	attachmentID := c.Param("id")
	if attachmentID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Attachment ID is required"})
		return
	}

	// Get attachment
	attachment, err := h.messageService.GetAttachment(attachmentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Serve file
	c.File(attachment.FilePath)
}

// UploadFile uploads a file
func (h *MessageHandler) UploadFile(c *gin.Context) {
	// Get channel ID
	channelID := c.Param("id")
	if channelID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Channel ID is required"})
		return
	}

	// Get user ID from context
	userId, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Check if user is a member of the channel
	hasAccess, err := h.serverService.HasChannelAccess(channelID, userId.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if !hasAccess {
		c.JSON(http.StatusForbidden, gin.H{"error": "You are not a member of this channel"})
		return
	}

	// Get file
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File is required"})
		return
	}

	fmt.Println("File:", file)
	fmt.Println("File name:", file.Filename)
	fmt.Println("File size:", file.Size)

	// Create a message ID for the attachment
	messageID := uuid.New().String()

	// Save file and get path
	filePath, err := h.messageService.SaveAttachment(file, messageID)
	if err != nil {
		fmt.Println("SaveAttachment error:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ファイルのアップロードに失敗しました: " + err.Error()})
		return
	}
	fmt.Println("File saved at:", filePath)

	// Create a message with the attachments
	message := models.Message{
		ID:          messageID,
		ChannelId:   channelID,
		UserId:      userId.(string),
		Content:     "ファイルがアップロードされました",
		Role:        "user",
		Timestamp:   time.Now(),
		Attachments: []string{filePath},
	}

	// Save message
	if err := h.messageService.SaveMessage(message); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "File uploaded successfully",
		"path":    filePath,
	})
}
