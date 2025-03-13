-- +migrate Up
-- まず、usersテーブルのid列の型を確認するクエリを実行
DO $$
DECLARE
    user_id_type text;
BEGIN
    SELECT data_type INTO user_id_type
    FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'id';
    
    IF user_id_type = 'uuid' THEN
        -- usersテーブルのidがUUID型の場合、すべてのIDカラムをUUID型にする
        CREATE TABLE IF NOT EXISTS servers (
            id UUID PRIMARY KEY,
            name VARCHAR(50) NOT NULL,
            description VARCHAR(200),
            owner_id UUID NOT NULL,
            created_at TIMESTAMP NOT NULL,
            updated_at TIMESTAMP NOT NULL,
            FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS channels (
            id UUID PRIMARY KEY,
            server_id UUID NOT NULL,
            name VARCHAR(50) NOT NULL,
            description VARCHAR(200),
            is_private BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMP NOT NULL,
            updated_at TIMESTAMP NOT NULL,
            FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS server_members (
            id UUID PRIMARY KEY,
            server_id UUID NOT NULL,
            user_id UUID NOT NULL,
            role VARCHAR(20) NOT NULL,
            joined_at TIMESTAMP NOT NULL,
            updated_at TIMESTAMP NOT NULL,
            FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE (server_id, user_id)
        );

        CREATE TABLE IF NOT EXISTS channel_members (
            id UUID PRIMARY KEY,
            channel_id UUID NOT NULL,
            user_id UUID NOT NULL,
            added_at TIMESTAMP NOT NULL,
            FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE (channel_id, user_id)
        );

        -- Update messages table to support channels and editing
        ALTER TABLE messages ADD COLUMN IF NOT EXISTS channel_id UUID;
        ALTER TABLE messages ADD COLUMN IF NOT EXISTS user_id UUID;
        ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_edited BOOLEAN NOT NULL DEFAULT FALSE;
        ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
        ALTER TABLE messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP;

        -- Add foreign keys
        ALTER TABLE messages ADD CONSTRAINT fk_messages_channel
            FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE;
        ALTER TABLE messages ADD CONSTRAINT fk_messages_user
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

        -- Create attachments table
        CREATE TABLE IF NOT EXISTS attachments (
            id UUID PRIMARY KEY,
            message_id UUID NOT NULL,
            file_name VARCHAR(255) NOT NULL,
            file_type VARCHAR(50) NOT NULL,
            file_path VARCHAR(255) NOT NULL,
            file_size BIGINT NOT NULL,
            uploaded_at TIMESTAMP NOT NULL,
            FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
        );
    ELSE
        -- usersテーブルのidが文字列型の場合、すべてのIDカラムをVARCHAR(36)にする
        CREATE TABLE IF NOT EXISTS servers (
            id VARCHAR(36) PRIMARY KEY,
            name VARCHAR(50) NOT NULL,
            description VARCHAR(200),
            owner_id VARCHAR(36) NOT NULL,
            created_at TIMESTAMP NOT NULL,
            updated_at TIMESTAMP NOT NULL,
            FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS channels (
            id VARCHAR(36) PRIMARY KEY,
            server_id VARCHAR(36) NOT NULL,
            name VARCHAR(50) NOT NULL,
            description VARCHAR(200),
            is_private BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMP NOT NULL,
            updated_at TIMESTAMP NOT NULL,
            FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS server_members (
            id VARCHAR(36) PRIMARY KEY,
            server_id VARCHAR(36) NOT NULL,
            user_id VARCHAR(36) NOT NULL,
            role VARCHAR(20) NOT NULL,
            joined_at TIMESTAMP NOT NULL,
            updated_at TIMESTAMP NOT NULL,
            FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE (server_id, user_id)
        );

        CREATE TABLE IF NOT EXISTS channel_members (
            id VARCHAR(36) PRIMARY KEY,
            channel_id VARCHAR(36) NOT NULL,
            user_id VARCHAR(36) NOT NULL,
            added_at TIMESTAMP NOT NULL,
            FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE (channel_id, user_id)
        );

        -- Update messages table to support channels and editing
        ALTER TABLE messages ADD COLUMN IF NOT EXISTS channel_id VARCHAR(36);
        ALTER TABLE messages ADD COLUMN IF NOT EXISTS user_id VARCHAR(36);
        ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_edited BOOLEAN NOT NULL DEFAULT FALSE;
        ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
        ALTER TABLE messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP;

        -- Add foreign keys
        ALTER TABLE messages ADD CONSTRAINT fk_messages_channel
            FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE;
        ALTER TABLE messages ADD CONSTRAINT fk_messages_user
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

        -- Create attachments table
        CREATE TABLE IF NOT EXISTS attachments (
            id VARCHAR(36) PRIMARY KEY,
            message_id VARCHAR(36) NOT NULL,
            file_name VARCHAR(255) NOT NULL,
            file_type VARCHAR(50) NOT NULL,
            file_path VARCHAR(255) NOT NULL,
            file_size BIGINT NOT NULL,
            uploaded_at TIMESTAMP NOT NULL,
            FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
        );
    END IF;
END $$;

-- +migrate Down
DROP TABLE IF EXISTS attachments;
DROP TABLE IF EXISTS channel_members;
DROP TABLE IF EXISTS server_members;
DROP TABLE IF EXISTS channels;
DROP TABLE IF EXISTS servers;

-- Remove added columns from messages
ALTER TABLE messages DROP CONSTRAINT IF EXISTS fk_messages_channel;
ALTER TABLE messages DROP CONSTRAINT IF EXISTS fk_messages_user;
ALTER TABLE messages DROP COLUMN IF EXISTS channel_id;
ALTER TABLE messages DROP COLUMN IF EXISTS user_id;
ALTER TABLE messages DROP COLUMN IF EXISTS is_edited;
ALTER TABLE messages DROP COLUMN IF EXISTS is_deleted;
ALTER TABLE messages DROP COLUMN IF EXISTS edited_at; 