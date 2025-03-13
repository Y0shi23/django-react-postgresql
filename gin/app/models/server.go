package models

import (
	"time"
)

// Server represents a server room where users can join and chat
type Server struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	OwnerId     string    `json:"ownerId"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

// Category represents a grouping of channels within a server
type Category struct {
	ID        string    `json:"id"`
	ServerId  string    `json:"serverId"`
	Name      string    `json:"name"`
	Position  int       `json:"position"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// Channel represents a channel within a server
type Channel struct {
	ID          string    `json:"id"`
	ServerId    string    `json:"serverId"`
	CategoryId  string    `json:"categoryId"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	IsPrivate   bool      `json:"isPrivate"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

// ServerMember represents a user's membership in a server
type ServerMember struct {
	ID        string    `json:"id"`
	ServerId  string    `json:"serverId"`
	UserId    string    `json:"userId"`
	Role      string    `json:"role"` // "owner", "admin", "member"
	JoinedAt  time.Time `json:"joinedAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// ChannelMember represents a user's access to a private channel
type ChannelMember struct {
	ID        string    `json:"id"`
	ChannelId string    `json:"channelId"`
	UserId    string    `json:"userId"`
	AddedAt   time.Time `json:"addedAt"`
}

// ServerRequest represents the request to create a new server
type ServerRequest struct {
	Name        string `json:"name" binding:"required,min=3,max=50"`
	Description string `json:"description" binding:"max=200"`
}

// ChannelRequest represents the request to create a new channel
type ChannelRequest struct {
	Name        string `json:"name" binding:"required,min=3,max=50"`
	Description string `json:"description" binding:"max=200"`
	IsPrivate   bool   `json:"isPrivate"`
	CategoryId  string `json:"categoryId"`
}

// ServerResponse represents the server data returned to clients
type ServerResponse struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	OwnerId     string    `json:"ownerId"`
	CreatedAt   time.Time `json:"createdAt"`
	MemberCount int       `json:"memberCount"`
}

// ChannelResponse represents the channel data returned to clients
type ChannelResponse struct {
	ID          string    `json:"id"`
	ServerId    string    `json:"serverId"`
	CategoryId  string    `json:"categoryId"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	IsPrivate   bool      `json:"isPrivate"`
	CreatedAt   time.Time `json:"createdAt"`
}

// CategoryRequest represents the request to create a new category
type CategoryRequest struct {
	Name string `json:"name" binding:"required,min=1,max=50"`
}

// CategoryResponse represents the category data returned to clients
type CategoryResponse struct {
	ID        string    `json:"id"`
	ServerId  string    `json:"serverId"`
	Name      string    `json:"name"`
	Position  int       `json:"position"`
	CreatedAt time.Time `json:"createdAt"`
}
