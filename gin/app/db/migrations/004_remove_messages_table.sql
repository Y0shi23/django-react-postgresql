-- +migrate Up
-- Remove the legacy messages table and attachments table

-- First drop any foreign keys that reference the messages table
ALTER TABLE attachments DROP CONSTRAINT IF EXISTS attachments_message_id_fkey;

-- Drop the attachments table
DROP TABLE IF EXISTS attachments;

-- Drop the messages table
DROP TABLE IF EXISTS messages;

-- +migrate Down
-- Recreate the messages and attachments tables

-- Recreate messages table
CREATE TABLE messages (
    id UUID PRIMARY KEY,
    content TEXT NOT NULL,
    role VARCHAR(50),
    timestamp TIMESTAMP NOT NULL,
    chat_id UUID,
    channel_id UUID,
    user_id UUID,
    is_edited BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    edited_at TIMESTAMP,
    FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
    FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Recreate attachments table
CREATE TABLE attachments (
    id UUID PRIMARY KEY,
    message_id UUID NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    uploaded_at TIMESTAMP NOT NULL,
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX idx_messages_chat_id ON messages(chat_id);
CREATE INDEX idx_messages_channel_id ON messages(channel_id);
CREATE INDEX idx_messages_user_id ON messages(user_id);
CREATE INDEX idx_attachments_message_id ON attachments(message_id); 