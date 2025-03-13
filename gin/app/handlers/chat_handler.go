// 3つの主要なエンドポイントを提供：
package handlers

import (
	"fmt"
	"net/http"

	"app/models"
	"app/services"

	"github.com/gin-gonic/gin"
)

type ChatHandler struct {
	chatService *services.ChatService
}

func NewChatHandler(chatService *services.ChatService) *ChatHandler {
	return &ChatHandler{
		chatService: chatService,
	}
}

// 新しいチャットを作成
func (h *ChatHandler) CreateChat(c *gin.Context) {
	// ユーザーIDを取得
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var req struct {
		Message string `json:"message"`
	}
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request",
			"details": err.Error(),
		})
		return
	}

	if req.Message == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Message cannot be empty",
		})
		return
	}

	chatID, messages, err := h.chatService.CreateNewChat(req.Message, userID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Failed to create chat: %v", err),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"chatId":   chatID,
		"messages": messages,
	})
}

// 特定のチャットの履歴を取得
func (h *ChatHandler) GetChat(c *gin.Context) {
	// ユーザーIDを取得
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	chatID := c.Param("id")
	chat, exists := h.chatService.GetChat(chatID, userID.(string))
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Chat not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"messages": chat.Messages,
	})
}

// 既存のチャットにメッセージを追加
func (h *ChatHandler) AddMessage(c *gin.Context) {
	// ユーザーIDを取得
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	chatID := c.Param("id")
	var req struct {
		Message string `json:"message" binding:"required"`
	}
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	message, err := h.chatService.AddMessage(chatID, req.Message, userID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate response"})
		return
	}

	if message == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Chat not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": message,
		"status":  "success",
	})
}

// チャット履歴を取得
func (h *ChatHandler) GetChatHistory(c *gin.Context) {
	// ユーザーIDを取得
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	chats, err := h.chatService.GetChatHistory(userID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch chat history",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"chats": chats,
	})
}

// チャットメッセージを編集
func (h *ChatHandler) EditChatMessage(c *gin.Context) {
	// ユーザーIDを取得
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// メッセージIDを取得
	messageID := c.Param("messageId")
	if messageID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Message ID is required"})
		return
	}

	// リクエストボディを解析
	var req models.EditMessageRequest
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	// メッセージを編集
	err := h.chatService.EditChatMessage(messageID, req.Content, userID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Message updated successfully",
	})
}

// チャットメッセージを削除
func (h *ChatHandler) DeleteChatMessage(c *gin.Context) {
	// ユーザーIDを取得
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// メッセージIDを取得
	messageID := c.Param("messageId")
	if messageID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Message ID is required"})
		return
	}

	// メッセージを削除
	err := h.chatService.DeleteChatMessage(messageID, userID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Message deleted successfully",
	})
}
