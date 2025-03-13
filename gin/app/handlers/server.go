package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"app/models"
	"app/services"
)

// ServerHandler handles server-related requests
type ServerHandler struct {
	serverService *services.ServerService
}

// NewServerHandler creates a new server handler
func NewServerHandler(serverService *services.ServerService) *ServerHandler {
	return &ServerHandler{
		serverService: serverService,
	}
}

// CreateServer handles the creation of a new server
func (h *ServerHandler) CreateServer(c *gin.Context) {
	var req models.ServerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get user ID from context
	userId, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "認証が必要です"})
		return
	}

	server := models.Server{
		ID:          uuid.New().String(),
		Name:        req.Name,
		Description: req.Description,
		OwnerId:     userId.(string),
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	if err := h.serverService.CreateServer(server); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "サーバーの作成に失敗しました"})
		return
	}

	// Create default "general" channel
	channel := models.Channel{
		ID:          uuid.New().String(),
		ServerId:    server.ID,
		Name:        "general",
		Description: "General discussion",
		IsPrivate:   false,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	if err := h.serverService.CreateChannel(channel); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "チャンネルの作成に失敗しました"})
		return
	}

	// Add owner as a member with "owner" role
	member := models.ServerMember{
		ID:        uuid.New().String(),
		ServerId:  server.ID,
		UserId:    userId.(string),
		Role:      "owner",
		JoinedAt:  time.Now(),
		UpdatedAt: time.Now(),
	}

	if err := h.serverService.AddServerMember(member); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "メンバーの追加に失敗しました"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "サーバーが作成されました",
		"server": models.ServerResponse{
			ID:          server.ID,
			Name:        server.Name,
			Description: server.Description,
			OwnerId:     server.OwnerId,
			CreatedAt:   server.CreatedAt,
			MemberCount: 1,
		},
	})
}

// GetUserServers returns all servers a user is a member of
func (h *ServerHandler) GetUserServers(c *gin.Context) {
	userId, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "認証が必要です"})
		return
	}

	servers, err := h.serverService.GetUserServers(userId.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "サーバーの取得に失敗しました"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"servers": servers})
}

// GetServerChannels returns all channels in a server
func (h *ServerHandler) GetServerChannels(c *gin.Context) {
	// Get server ID from URL parameter
	serverId := c.Param("id")
	if serverId == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "サーバーIDが必要です"})
		return
	}

	// Get user ID from context
	userId, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "認証が必要です"})
		return
	}

	// Check if user is a member of the server
	isMember, err := h.serverService.IsServerMember(serverId, userId.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "サーバーメンバーの確認に失敗しました"})
		return
	}

	if !isMember {
		c.JSON(http.StatusForbidden, gin.H{"error": "このサーバーにアクセスする権限がありません"})
		return
	}

	channels, err := h.serverService.GetServerChannels(serverId, userId.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "チャンネルの取得に失敗しました"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"channels": channels})
}

// CreateChannel handles the creation of a new channel in a server
func (h *ServerHandler) CreateChannel(c *gin.Context) {
	// Get server ID from URL parameter
	serverId := c.Param("id")
	if serverId == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "サーバーIDが必要です"})
		return
	}

	// Get user ID from context
	userId, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "認証が必要です"})
		return
	}

	var req models.ChannelRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if user has permission to create channels (owner only)
	hasPermission, err := h.serverService.HasChannelManagementPermission(serverId, userId.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "権限の確認に失敗しました"})
		return
	}

	if !hasPermission {
		c.JSON(http.StatusForbidden, gin.H{"error": "チャンネルを作成できるのはサーバーの作成者のみです"})
		return
	}

	// If categoryId is provided and not empty, verify it belongs to this server
	if req.CategoryId != "" {
		categoryServerId, err := h.serverService.GetServerIdByCategoryId(req.CategoryId)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "カテゴリー情報の取得に失敗しました"})
			return
		}

		if categoryServerId != serverId {
			c.JSON(http.StatusBadRequest, gin.H{"error": "指定されたカテゴリーはこのサーバーに属していません"})
			return
		}
	}

	channel := models.Channel{
		ID:          uuid.New().String(),
		ServerId:    serverId,
		CategoryId:  req.CategoryId,
		Name:        req.Name,
		Description: req.Description,
		IsPrivate:   req.IsPrivate,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	if err := h.serverService.CreateChannel(channel); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "チャンネルの作成に失敗しました"})
		return
	}

	// If it's a private channel, add the creator as a member
	if channel.IsPrivate {
		channelMember := models.ChannelMember{
			ID:        uuid.New().String(),
			ChannelId: channel.ID,
			UserId:    userId.(string),
			AddedAt:   time.Now(),
		}

		if err := h.serverService.AddChannelMember(channelMember); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "チャンネルメンバーの追加に失敗しました"})
			return
		}
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "チャンネルが作成されました",
		"channel": models.ChannelResponse{
			ID:          channel.ID,
			ServerId:    channel.ServerId,
			CategoryId:  channel.CategoryId,
			Name:        channel.Name,
			Description: channel.Description,
			IsPrivate:   channel.IsPrivate,
			CreatedAt:   channel.CreatedAt,
		},
	})
}

// AddChannelMember adds a user to a private channel
func (h *ServerHandler) AddChannelMember(c *gin.Context) {
	// Get channel ID from URL parameter
	channelId := c.Param("id")
	if channelId == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "チャンネルIDが必要です"})
		return
	}

	// Get user ID from context
	userId, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "認証が必要です"})
		return
	}

	var req struct {
		UserId string `json:"userId" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if the channel is private
	isPrivate, err := h.serverService.IsChannelPrivate(channelId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "チャンネル情報の取得に失敗しました"})
		return
	}

	if !isPrivate {
		c.JSON(http.StatusBadRequest, gin.H{"error": "このチャンネルはプライベートではありません"})
		return
	}

	// Check if user has permission to add members
	hasPermission, err := h.serverService.HasChannelManagementPermission(channelId, userId.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "権限の確認に失敗しました"})
		return
	}

	if !hasPermission {
		c.JSON(http.StatusForbidden, gin.H{"error": "メンバーを追加する権限がありません"})
		return
	}

	// Check if target user is a member of the server
	serverId, err := h.serverService.GetServerIdByChannelId(channelId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "サーバー情報の取得に失敗しました"})
		return
	}

	isMember, err := h.serverService.IsServerMember(serverId, req.UserId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "サーバーメンバーの確認に失敗しました"})
		return
	}

	if !isMember {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ユーザーはこのサーバーのメンバーではありません"})
		return
	}

	// Add user to channel
	channelMember := models.ChannelMember{
		ID:        uuid.New().String(),
		ChannelId: channelId,
		UserId:    req.UserId,
		AddedAt:   time.Now(),
	}

	if err := h.serverService.AddChannelMember(channelMember); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "チャンネルメンバーの追加に失敗しました"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "メンバーがチャンネルに追加されました"})
}

// JoinServer allows a user to join a server
func (h *ServerHandler) JoinServer(c *gin.Context) {
	// Get server ID from URL parameter
	serverId := c.Param("id")
	if serverId == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "サーバーIDが必要です"})
		return
	}

	// Get user ID from context
	userId, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "認証が必要です"})
		return
	}

	// Check if user is already a member
	isMember, err := h.serverService.IsServerMember(serverId, userId.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "サーバーメンバーの確認に失敗しました"})
		return
	}

	if isMember {
		c.JSON(http.StatusBadRequest, gin.H{"error": "すでにこのサーバーのメンバーです"})
		return
	}

	// Add user as a member with "member" role
	member := models.ServerMember{
		ID:        uuid.New().String(),
		ServerId:  serverId,
		UserId:    userId.(string),
		Role:      "member",
		JoinedAt:  time.Now(),
		UpdatedAt: time.Now(),
	}

	if err := h.serverService.AddServerMember(member); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "サーバーへの参加に失敗しました"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "サーバーに参加しました"})
}

// CreateCategory handles the creation of a new category in a server
func (h *ServerHandler) CreateCategory(c *gin.Context) {
	// Get server ID from URL parameter
	serverId := c.Param("id")
	if serverId == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "サーバーIDが必要です"})
		return
	}

	// Get user ID from context
	userId, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "認証が必要です"})
		return
	}

	var req models.CategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if user has permission to create categories (owner only)
	hasPermission, err := h.serverService.HasChannelManagementPermission(serverId, userId.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "権限の確認に失敗しました"})
		return
	}

	if !hasPermission {
		c.JSON(http.StatusForbidden, gin.H{"error": "カテゴリーを作成できるのはサーバーの作成者のみです"})
		return
	}

	// Get the highest position to place the new category at the end
	categories, err := h.serverService.GetServerCategories(serverId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "カテゴリーの取得に失敗しました"})
		return
	}

	position := 0
	if len(categories) > 0 {
		position = categories[len(categories)-1].Position + 1
	}

	category := models.Category{
		ID:        uuid.New().String(),
		ServerId:  serverId,
		Name:      req.Name,
		Position:  position,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	if err := h.serverService.CreateCategory(category); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "カテゴリーの作成に失敗しました"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "カテゴリーが作成されました",
		"category": models.CategoryResponse{
			ID:        category.ID,
			ServerId:  category.ServerId,
			Name:      category.Name,
			Position:  category.Position,
			CreatedAt: category.CreatedAt,
		},
	})
}

// GetServerCategories returns all categories in a server
func (h *ServerHandler) GetServerCategories(c *gin.Context) {
	// Get server ID from URL parameter
	serverId := c.Param("id")
	if serverId == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "サーバーIDが必要です"})
		return
	}

	// Get user ID from context
	userId, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "認証が必要です"})
		return
	}

	// Check if user is a member of the server
	isMember, err := h.serverService.IsServerMember(serverId, userId.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "サーバーメンバーの確認に失敗しました"})
		return
	}

	if !isMember {
		c.JSON(http.StatusForbidden, gin.H{"error": "このサーバーにアクセスする権限がありません"})
		return
	}

	categories, err := h.serverService.GetServerCategories(serverId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "カテゴリーの取得に失敗しました"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"categories": categories})
}

// UpdateChannelCategory updates a channel's category
func (h *ServerHandler) UpdateChannelCategory(c *gin.Context) {
	// Get channel ID from URL parameter
	channelId := c.Param("id")
	if channelId == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "チャンネルIDが必要です"})
		return
	}

	// Get user ID from context
	userId, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "認証が必要です"})
		return
	}

	var req struct {
		CategoryId string `json:"categoryId" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get server ID for the channel
	serverId, err := h.serverService.GetServerIdByChannelId(channelId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "チャンネル情報の取得に失敗しました"})
		return
	}

	// Check if user has permission to manage channels
	hasPermission, err := h.serverService.HasChannelManagementPermission(serverId, userId.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "権限の確認に失敗しました"})
		return
	}

	if !hasPermission {
		c.JSON(http.StatusForbidden, gin.H{"error": "チャンネルを管理する権限がありません"})
		return
	}

	// Update the channel's category
	if err := h.serverService.UpdateChannelCategory(channelId, req.CategoryId); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "チャンネルの更新に失敗しました"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "チャンネルのカテゴリーが更新されました"})
}

// DeleteChannel handles the deletion of a channel
func (h *ServerHandler) DeleteChannel(c *gin.Context) {
	// Get channel ID from URL parameter
	channelId := c.Param("id")
	if channelId == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "チャンネルIDが必要です"})
		return
	}

	// Get user ID from context
	userId, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "認証が必要です"})
		return
	}

	// Check if the user is the owner of the server that contains this channel
	isOwner, err := h.serverService.IsUserServerOwnerByChannelId(channelId, userId.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if !isOwner {
		c.JSON(http.StatusForbidden, gin.H{"error": "このチャンネルを削除する権限がありません"})
		return
	}

	// Delete the channel
	if err := h.serverService.DeleteChannel(channelId); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "チャンネルが削除されました"})
}

// GetChannel handles the retrieval of a channel by ID
func (h *ServerHandler) GetChannel(c *gin.Context) {
	channelID := c.Param("id")
	if channelID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "チャンネルIDが必要です"})
		return
	}

	// Get user ID from context
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "認証が必要です"})
		return
	}

	channel, err := h.serverService.GetChannelByID(channelID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "チャンネルが見つかりません"})
		return
	}

	// Check if user has access to this channel
	hasAccess, err := h.serverService.UserHasAccessToChannel(userID.(string), channelID)
	if err != nil || !hasAccess {
		c.JSON(http.StatusForbidden, gin.H{"error": "このチャンネルにアクセスする権限がありません"})
		return
	}

	c.JSON(http.StatusOK, channel)
}
