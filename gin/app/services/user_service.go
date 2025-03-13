package services

import (
	"app/models"
	"database/sql"
	"errors"
	"fmt"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type UserService struct {
	db *sql.DB
}

func NewUserService(db *sql.DB) *UserService {
	return &UserService{db: db}
}

// Register creates a new user in the database
func (s *UserService) Register(req models.RegisterRequest) (*models.UserResponse, error) {
	// Check if user with email already exists
	var count int
	err := s.db.QueryRow("SELECT COUNT(*) FROM users WHERE email = $1", req.Email).Scan(&count)
	if err != nil {
		return nil, fmt.Errorf("error checking existing user: %w", err)
	}
	if count > 0 {
		return nil, errors.New("user with this email already exists")
	}

	// Check if username is taken
	err = s.db.QueryRow("SELECT COUNT(*) FROM users WHERE username = $1", req.Username).Scan(&count)
	if err != nil {
		return nil, fmt.Errorf("error checking existing username: %w", err)
	}
	if count > 0 {
		return nil, errors.New("username is already taken")
	}

	// Hash the password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("error hashing password: %w", err)
	}

	// Generate a new UUID for the user
	userID := uuid.New().String()
	now := time.Now()

	// Insert the new user
	_, err = s.db.Exec(
		"INSERT INTO users (id, username, email, password, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)",
		userID, req.Username, req.Email, string(hashedPassword), now, now,
	)
	if err != nil {
		return nil, fmt.Errorf("error creating user: %w", err)
	}

	// Generate JWT token
	token, err := s.generateToken(userID)
	if err != nil {
		return nil, fmt.Errorf("error generating token: %w", err)
	}

	// Return user response
	return &models.UserResponse{
		ID:        userID,
		Username:  req.Username,
		Email:     req.Email,
		CreatedAt: now,
		Token:     token,
	}, nil
}

// Login authenticates a user and returns a JWT token
func (s *UserService) Login(req models.LoginRequest) (*models.UserResponse, error) {
	var user models.User
	var hashedPassword string

	// Find user by email
	err := s.db.QueryRow(
		"SELECT id, username, email, password, created_at, updated_at FROM users WHERE email = $1",
		req.Email,
	).Scan(&user.ID, &user.Username, &user.Email, &hashedPassword, &user.CreatedAt, &user.UpdatedAt)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, errors.New("invalid email or password")
		}
		return nil, fmt.Errorf("error finding user: %w", err)
	}

	// Verify password
	err = bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(req.Password))
	if err != nil {
		return nil, errors.New("invalid email or password")
	}

	// Generate JWT token
	token, err := s.generateToken(user.ID)
	if err != nil {
		return nil, fmt.Errorf("error generating token: %w", err)
	}

	// Return user response
	return &models.UserResponse{
		ID:        user.ID,
		Username:  user.Username,
		Email:     user.Email,
		CreatedAt: user.CreatedAt,
		Token:     token,
	}, nil
}

// GetUserByID retrieves a user by their ID
func (s *UserService) GetUserByID(userID string) (*models.User, error) {
	var user models.User

	err := s.db.QueryRow(
		"SELECT id, username, email, created_at, updated_at FROM users WHERE id = $1",
		userID,
	).Scan(&user.ID, &user.Username, &user.Email, &user.CreatedAt, &user.UpdatedAt)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, errors.New("user not found")
		}
		return nil, fmt.Errorf("error finding user: %w", err)
	}

	return &user, nil
}

// ValidateToken validates a JWT token and returns the user ID
func (s *UserService) ValidateToken(tokenString string) (string, error) {
	// Parse the token
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		// Validate the signing method
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}

		// Return the secret key
		jwtSecret := os.Getenv("JWT_SECRET")
		if jwtSecret == "" {
			return nil, errors.New("JWT_SECRET is not set")
		}
		return []byte(jwtSecret), nil
	})

	if err != nil {
		return "", err
	}

	// Validate the token
	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		userID, ok := claims["userID"].(string)
		if !ok {
			return "", errors.New("invalid token claims")
		}
		return userID, nil
	}

	return "", errors.New("invalid token")
}

// generateToken generates a new JWT token for the given user ID
func (s *UserService) generateToken(userID string) (string, error) {
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		return "", errors.New("JWT_SECRET is not set")
	}

	// Create token claims
	claims := jwt.MapClaims{
		"userID": userID,
		"exp":    time.Now().Add(time.Hour * 24 * 7).Unix(), // Token valid for 7 days
	}

	// Create token
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	// Sign token with secret key
	tokenString, err := token.SignedString([]byte(jwtSecret))
	if err != nil {
		return "", err
	}

	return tokenString, nil
}
