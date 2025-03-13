package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"app/db"
	"app/handlers"
	"app/services"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/sashabaranov/go-openai"
)

// authMiddleware is a middleware function that checks if the user is authenticated
func authMiddleware(userService *services.UserService) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get the Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header is required"})
			c.Abort()
			return
		}

		// Extract the token
		tokenString := authHeader
		if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
			tokenString = authHeader[7:]
		}

		// Validate the token
		userID, err := userService.ValidateToken(tokenString)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		// Set the user ID in the context
		c.Set("userID", userID)
		c.Next()
	}
}

func main() {
	// ロガーの設定
	gin.SetMode(gin.DebugMode)
	gin.DefaultWriter = os.Stdout
	log.SetOutput(os.Stdout)
	log.SetFlags(log.LstdFlags | log.Lshortfile)

	// OpenAIクライアントの初期化
	apiKey := os.Getenv("OPENAI_API_KEY")
	if apiKey == "" {
		fmt.Println("Warning: OPENAI_API_KEY is not set")
	}
	openaiClient := openai.NewClient(apiKey)

	// JWT secret の確認
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		panic("JWT_SECRET is not set")
	}

	// データベース接続の初期化
	db, err := db.NewDB()
	if err != nil {
		panic(fmt.Sprintf("データベース接続に失敗しました: %s", err))
	}
	defer db.Close()

	// サービスとハンドラーの初期化
	chatService := services.NewChatService(db, openaiClient)
	chatHandler := handlers.NewChatHandler(chatService)

	// ユーザー認証サービスとハンドラーの初期化
	userService := services.NewUserService(db)
	authHandler := handlers.NewAuthHandler(userService)

	// サーバーとメッセージのサービスとハンドラーの初期化
	serverService := services.NewServerService(db)
	serverHandler := handlers.NewServerHandler(serverService)

	// チャンネルメッセージサービスとハンドラーの初期化
	channelMessageService := services.NewChannelMessageService(db)
	channelMessageHandler := handlers.NewChannelMessageHandler(channelMessageService, serverService)

	// 従来のメッセージサービスとハンドラー（後方互換性のため）
	messageService := services.NewMessageService(db)
	messageHandler := handlers.NewMessageHandler(messageService, serverService)

	// WebSocketサービスとハンドラーの初期化
	wsService := services.NewWebSocketService()
	wsHandler := handlers.NewWebSocketHandler(wsService, userService, serverService)

	engine := gin.Default()

	// 信頼するプロキシを設定
	engine.SetTrustedProxies([]string{"127.0.0.1"})

	// CORSの設定
	engine.Use(cors.New(cors.Config{
		AllowOrigins: []string{"http://localhost:3000", "http://localhost:5173", "http://frontend:5173"},
		AllowMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders: []string{
			"Origin",
			"Content-Type",
			"Content-Length",
			"Accept-Encoding",
			"X-CSRF-Token",
			"Authorization",
		},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// 静的ファイルの提供
	engine.Static("/uploads", "./uploads")

	// ルーティングの設定
	api := engine.Group("/api")
	{
		// 認証関連のエンドポイント
		auth := api.Group("/auth")
		{
			auth.POST("/register", authHandler.Register)
			auth.POST("/login", authHandler.Login)
			auth.GET("/me", authMiddleware(userService), authHandler.GetCurrentUser)
		}

		// ユーザー関連のエンドポイント
		users := api.Group("/users", authMiddleware(userService))
		{
			users.GET("/me", authHandler.GetCurrentUser) // /api/auth/meと同じ機能
			users.GET("/:id", authHandler.GetUserById)   // 特定のユーザー情報を取得
		}

		// チャット関連のエンドポイント
		chats := api.Group("/chats", authMiddleware(userService))
		{
			chats.GET("", chatHandler.GetChatHistory)
			chats.POST("", chatHandler.CreateChat)
			chats.GET("/:id", chatHandler.GetChat)
			chats.POST("/:id/messages", chatHandler.AddMessage)
		}

		// メッセージ編集・削除用のエンドポイント
		messages := api.Group("/messages", authMiddleware(userService))
		{
			messages.PUT("/:messageId", chatHandler.EditChatMessage)
			messages.DELETE("/:messageId", chatHandler.DeleteChatMessage)
		}

		// サーバー関連のエンドポイント
		servers := api.Group("/servers", authMiddleware(userService))
		{
			servers.POST("", serverHandler.CreateServer)
			servers.GET("", serverHandler.GetUserServers)
			servers.GET("/:id/channels", serverHandler.GetServerChannels)
			servers.POST("/:id/channels", serverHandler.CreateChannel)
			servers.POST("/:id/categories", serverHandler.CreateCategory)
			servers.POST("/:id/join", serverHandler.JoinServer)
			servers.GET("/:id/categories", serverHandler.GetServerCategories)
		}

		// チャンネル関連のエンドポイント（従来のハンドラー - 後方互換性のため）
		channels := api.Group("/channels", authMiddleware(userService))
		{
			channels.GET("/:id", serverHandler.GetChannel)
			channels.GET("/:id/messages", messageHandler.GetChannelMessages)
			channels.POST("/:id/messages", messageHandler.SendChannelMessage)
			channels.PUT("/messages/:id", messageHandler.EditMessage)
			channels.DELETE("/messages/:id", messageHandler.DeleteMessage)
			channels.POST("/:id/upload", messageHandler.UploadFile)
			channels.GET("/attachments/:id", messageHandler.GetAttachment)
			channels.POST("/:id/members", serverHandler.AddChannelMember)
			channels.POST("/:id/category", serverHandler.UpdateChannelCategory)
			channels.DELETE("/:id", serverHandler.DeleteChannel)
		}

		// 新しいチャンネルメッセージエンドポイント
		channelMessages := api.Group("/channel-messages", authMiddleware(userService))
		{
			channelMessages.GET("/:id", channelMessageHandler.GetChannelMessages)
			channelMessages.POST("/:id", channelMessageHandler.CreateChannelMessage)
			channelMessages.PUT("/:id", channelMessageHandler.EditChannelMessage)
			channelMessages.DELETE("/:id", channelMessageHandler.DeleteChannelMessage)
			channelMessages.POST("/attachments", channelMessageHandler.UploadChannelAttachment)
			channelMessages.GET("/attachments/:id", channelMessageHandler.GetChannelAttachment)
		}
	}

	// WebSocketエンドポイント
	engine.GET("/ws/channels/:channelId", wsHandler.HandleWebSocket)

	// メッセージの更新・削除時にWebSocketでブロードキャストするためのフックを設定
	messageHandler.SetWebSocketService(wsService)
	channelMessageHandler.SetWebSocketService(wsService)

	// サーバーの設定と起動
	server := &http.Server{
		Addr:    ":3000",
		Handler: engine,
	}

	fmt.Println("サーバーを起動しています...")
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		panic(fmt.Sprintf("サーバーの起動に失敗しました: %s", err))
	}
}
