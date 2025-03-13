package services

import (
	"database/sql"
	"fmt"
	"time"

	"app/models"
)

// ServerService handles server-related business logic
type ServerService struct {
	db *sql.DB
}

// NewServerService creates a new server service
func NewServerService(db *sql.DB) *ServerService {
	return &ServerService{
		db: db,
	}
}

// CreateServer creates a new server
func (s *ServerService) CreateServer(server models.Server) error {
	_, err := s.db.Exec(
		"INSERT INTO servers (id, name, description, owner_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)",
		server.ID, server.Name, server.Description, server.OwnerId, server.CreatedAt, server.UpdatedAt,
	)
	return err
}

// CreateChannel creates a new channel in a server
func (s *ServerService) CreateChannel(channel models.Channel) error {
	if channel.CategoryId == "" {
		// If no category ID is provided, set it to NULL in the database
		_, err := s.db.Exec(
			"INSERT INTO channels (id, server_id, name, description, is_private, created_at, updated_at) VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7)",
			channel.ID, channel.ServerId, channel.Name, channel.Description,
			channel.IsPrivate, channel.CreatedAt, channel.UpdatedAt,
		)
		return err
	} else {
		// If category ID is provided, include it in the query
		_, err := s.db.Exec(
			"INSERT INTO channels (id, server_id, category_id, name, description, is_private, created_at, updated_at) VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7, $8)",
			channel.ID, channel.ServerId, channel.CategoryId, channel.Name,
			channel.Description, channel.IsPrivate, channel.CreatedAt, channel.UpdatedAt,
		)
		return err
	}
}

// AddServerMember adds a user to a server
func (s *ServerService) AddServerMember(member models.ServerMember) error {
	_, err := s.db.Exec(
		"INSERT INTO server_members (id, server_id, user_id, role, joined_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)",
		member.ID, member.ServerId, member.UserId, member.Role, member.JoinedAt, member.UpdatedAt,
	)
	return err
}

// AddChannelMember adds a user to a private channel
func (s *ServerService) AddChannelMember(member models.ChannelMember) error {
	_, err := s.db.Exec(
		"INSERT INTO channel_members (id, channel_id, user_id, added_at) VALUES ($1, $2, $3, $4)",
		member.ID, member.ChannelId, member.UserId, member.AddedAt,
	)
	return err
}

// GetUserServers returns all servers a user is a member of
func (s *ServerService) GetUserServers(userId string) ([]models.ServerResponse, error) {
	rows, err := s.db.Query(`
		SELECT s.id, s.name, s.description, s.owner_id, s.created_at, 
		       (SELECT COUNT(*) FROM server_members WHERE server_id = s.id) as member_count
		FROM servers s
		JOIN server_members sm ON s.id = sm.server_id
		WHERE sm.user_id = $1
		ORDER BY s.created_at DESC
	`, userId)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var servers []models.ServerResponse
	for rows.Next() {
		var server models.ServerResponse
		if err := rows.Scan(
			&server.ID, &server.Name, &server.Description, &server.OwnerId,
			&server.CreatedAt, &server.MemberCount,
		); err != nil {
			return nil, err
		}
		servers = append(servers, server)
	}

	return servers, nil
}

// GetServerChannels returns all channels in a server that a user has access to
func (s *ServerService) GetServerChannels(serverId, userId string) ([]models.ChannelResponse, error) {
	rows, err := s.db.Query(`
		SELECT c.id, c.server_id, c.category_id, c.name, c.description, c.is_private, c.created_at
		FROM channels c
		WHERE c.server_id = $1::uuid AND (
			c.is_private = false OR 
			EXISTS (SELECT 1 FROM channel_members cm WHERE cm.channel_id = c.id AND cm.user_id = $2::uuid)
		)
		ORDER BY c.name ASC
	`, serverId, userId)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var channels []models.ChannelResponse
	for rows.Next() {
		var channel models.ChannelResponse
		var categoryId sql.NullString // Use NullString to handle NULL values

		if err := rows.Scan(
			&channel.ID, &channel.ServerId, &categoryId, &channel.Name, &channel.Description,
			&channel.IsPrivate, &channel.CreatedAt,
		); err != nil {
			return nil, err
		}

		// Convert NullString to string
		if categoryId.Valid {
			channel.CategoryId = categoryId.String
		} else {
			channel.CategoryId = ""
		}

		channels = append(channels, channel)
	}

	return channels, nil
}

// IsServerMember checks if a user is a member of a server
func (s *ServerService) IsServerMember(serverId, userId string) (bool, error) {
	var exists bool
	err := s.db.QueryRow(
		"SELECT EXISTS(SELECT 1 FROM server_members WHERE server_id = $1 AND user_id = $2)",
		serverId, userId,
	).Scan(&exists)
	return exists, err
}

// HasChannelManagementPermission checks if a user has permission to manage channels
func (s *ServerService) HasChannelManagementPermission(serverId, userId string) (bool, error) {
	var role string
	err := s.db.QueryRow(
		"SELECT role FROM server_members WHERE server_id = $1 AND user_id = $2",
		serverId, userId,
	).Scan(&role)
	if err != nil {
		if err == sql.ErrNoRows {
			return false, nil
		}
		return false, err
	}
	return role == "owner", nil
}

// IsChannelPrivate checks if a channel is private
func (s *ServerService) IsChannelPrivate(channelId string) (bool, error) {
	var isPrivate bool
	err := s.db.QueryRow(
		"SELECT is_private FROM channels WHERE id = $1",
		channelId,
	).Scan(&isPrivate)
	return isPrivate, err
}

// GetServerIdByChannelId returns the server ID for a channel
func (s *ServerService) GetServerIdByChannelId(channelId string) (string, error) {
	var serverId string
	err := s.db.QueryRow(
		"SELECT server_id FROM channels WHERE id = $1",
		channelId,
	).Scan(&serverId)
	return serverId, err
}

// HasChannelAccess checks if a user has access to a channel
func (s *ServerService) HasChannelAccess(channelId, userId string) (bool, error) {
	// Get the server ID for the channel
	var serverId string
	err := s.db.QueryRow(
		"SELECT server_id FROM channels WHERE id = $1",
		channelId,
	).Scan(&serverId)
	if err != nil {
		return false, err
	}

	// Check if user is a member of the server
	isMember, err := s.IsServerMember(serverId, userId)
	if err != nil || !isMember {
		return false, err
	}

	// Check if the channel is private
	var isPrivate bool
	err = s.db.QueryRow(
		"SELECT is_private FROM channels WHERE id = $1",
		channelId,
	).Scan(&isPrivate)
	if err != nil {
		return false, err
	}

	// If the channel is not private, the user has access
	if !isPrivate {
		return true, nil
	}

	// If the channel is private, check if the user is a member of the channel
	var exists bool
	err = s.db.QueryRow(
		"SELECT EXISTS(SELECT 1 FROM channel_members WHERE channel_id = $1 AND user_id = $2)",
		channelId, userId,
	).Scan(&exists)
	return exists, err
}

// CreateCategory creates a new category in a server
func (s *ServerService) CreateCategory(category models.Category) error {
	_, err := s.db.Exec(
		"INSERT INTO categories (id, server_id, name, position, created_at, updated_at) VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6)",
		category.ID, category.ServerId, category.Name, category.Position, category.CreatedAt, category.UpdatedAt,
	)
	return err
}

// GetServerCategories returns all categories in a server
func (s *ServerService) GetServerCategories(serverId string) ([]models.CategoryResponse, error) {
	rows, err := s.db.Query(`
		SELECT id, server_id, name, position, created_at
		FROM categories
		WHERE server_id = $1::uuid
		ORDER BY position ASC
	`, serverId)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var categories []models.CategoryResponse
	for rows.Next() {
		var category models.CategoryResponse
		if err := rows.Scan(
			&category.ID, &category.ServerId, &category.Name, &category.Position, &category.CreatedAt,
		); err != nil {
			return nil, err
		}
		categories = append(categories, category)
	}

	return categories, nil
}

// GetCategoryChannels returns all channels in a category
func (s *ServerService) GetCategoryChannels(categoryId, userId string) ([]models.ChannelResponse, error) {
	rows, err := s.db.Query(`
		SELECT c.id, c.server_id, c.category_id, c.name, c.description, c.is_private, c.created_at
		FROM channels c
		WHERE c.category_id = $1::uuid AND (
			c.is_private = false OR 
			EXISTS (SELECT 1 FROM channel_members cm WHERE cm.channel_id = c.id AND cm.user_id = $2::uuid)
		)
		ORDER BY c.name ASC
	`, categoryId, userId)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var channels []models.ChannelResponse
	for rows.Next() {
		var channel models.ChannelResponse
		var categoryId sql.NullString // Use NullString to handle NULL values

		if err := rows.Scan(
			&channel.ID, &channel.ServerId, &categoryId, &channel.Name, &channel.Description,
			&channel.IsPrivate, &channel.CreatedAt,
		); err != nil {
			return nil, err
		}

		// Convert NullString to string
		if categoryId.Valid {
			channel.CategoryId = categoryId.String
		} else {
			channel.CategoryId = ""
		}

		channels = append(channels, channel)
	}

	return channels, nil
}

// UpdateChannelCategory updates a channel's category
func (s *ServerService) UpdateChannelCategory(channelId, categoryId string) error {
	_, err := s.db.Exec(
		"UPDATE channels SET category_id = $1::uuid, updated_at = $2 WHERE id = $3::uuid",
		categoryId, time.Now(), channelId,
	)
	return err
}

// GetServerIdByCategoryId returns the server ID for a category
func (s *ServerService) GetServerIdByCategoryId(categoryId string) (string, error) {
	var serverId string
	err := s.db.QueryRow(
		"SELECT server_id FROM categories WHERE id = $1::uuid",
		categoryId,
	).Scan(&serverId)
	return serverId, err
}

// IsUserServerOwnerByChannelId checks if the user is the owner of the server that contains the channel
func (s *ServerService) IsUserServerOwnerByChannelId(channelId, userId string) (bool, error) {
	var ownerId string
	err := s.db.QueryRow(`
		SELECT s.owner_id 
		FROM servers s
		JOIN channels c ON s.id = c.server_id
		WHERE c.id = $1
	`, channelId).Scan(&ownerId)

	if err != nil {
		if err == sql.ErrNoRows {
			return false, nil
		}
		return false, err
	}

	return ownerId == userId, nil
}

// DeleteChannel deletes a channel
func (s *ServerService) DeleteChannel(channelId string) error {
	// Start a transaction
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Delete channel members
	_, err = tx.Exec("DELETE FROM channel_members WHERE channel_id = $1", channelId)
	if err != nil {
		return err
	}

	// Delete channel messages
	_, err = tx.Exec("DELETE FROM channel_messages WHERE channel_id = $1", channelId)
	if err != nil {
		return err
	}

	// Delete the channel
	_, err = tx.Exec("DELETE FROM channels WHERE id = $1", channelId)
	if err != nil {
		return err
	}

	// Commit the transaction
	return tx.Commit()
}

// チャンネルを取得
func (s *ServerService) GetChannelByID(channelID string) (models.Channel, error) {
	var channel models.Channel
	err := s.db.QueryRow(
		"SELECT id, server_id, category_id, name, description, is_private, created_at, updated_at FROM channels WHERE id = $1",
		channelID,
	).Scan(
		&channel.ID, &channel.ServerId, &channel.CategoryId, &channel.Name,
		&channel.Description, &channel.IsPrivate, &channel.CreatedAt, &channel.UpdatedAt,
	)
	return channel, err
}

// UserHasAccessToChannel checks if a user has access to a channel
func (s *ServerService) UserHasAccessToChannel(userID, channelID string) (bool, error) {
	// First check if the channel is private
	isPrivate, err := s.IsChannelPrivate(channelID)
	if err != nil {
		return false, err
	}

	// If the channel is not private, check if the user is a member of the server
	if !isPrivate {
		serverID, err := s.GetServerIdByChannelId(channelID)
		if err != nil {
			return false, err
		}
		return s.IsServerMember(serverID, userID)
	}

	// If the channel is private, check if the user is a member of the channel
	var count int
	err = s.db.QueryRow(
		"SELECT COUNT(*) FROM channel_members WHERE channel_id = $1 AND user_id = $2",
		channelID, userID,
	).Scan(&count)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

// UserHasChannelAccess はユーザーが指定されたチャンネルにアクセスできるかどうかを確認する
func (s *ServerService) UserHasChannelAccess(userID string, channelID string) (bool, error) {
	// チャンネルの情報を取得
	query := `
		SELECT c.id, c.server_id
		FROM channels c
		WHERE c.id = $1
	`
	var serverID string
	err := s.db.QueryRow(query, channelID).Scan(&channelID, &serverID)
	if err != nil {
		return false, fmt.Errorf("チャンネル情報の取得に失敗しました: %w", err)
	}

	// ユーザーがサーバーのメンバーかどうかを確認
	query = `
		SELECT COUNT(*)
		FROM server_members
		WHERE server_id = $1 AND user_id = $2
	`
	var count int
	err = s.db.QueryRow(query, serverID, userID).Scan(&count)
	if err != nil {
		return false, fmt.Errorf("サーバーメンバーシップの確認に失敗しました: %w", err)
	}

	return count > 0, nil
}
