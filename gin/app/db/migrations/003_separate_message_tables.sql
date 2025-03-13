-- +migrate Up
-- Create new tables for chatbot messages and channel messages

-- Create chatbot_messages table
CREATE TABLE chatbot_messages (
    id UUID PRIMARY KEY,
    chat_id UUID NOT NULL,
    content TEXT NOT NULL,
    role VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
);

-- Create channel_messages table
CREATE TABLE channel_messages (
    id UUID PRIMARY KEY,
    channel_id UUID NOT NULL,
    user_id UUID NOT NULL,
    content TEXT NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    is_edited BOOLEAN NOT NULL DEFAULT FALSE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    edited_at TIMESTAMP,
    FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create attachments table for channel messages
CREATE TABLE channel_attachments (
    id UUID PRIMARY KEY,
    message_id UUID NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    uploaded_at TIMESTAMP NOT NULL,
    FOREIGN KEY (message_id) REFERENCES channel_messages(id) ON DELETE CASCADE
);

-- Migrate existing data
-- Move chatbot messages to chatbot_messages table
INSERT INTO chatbot_messages (id, chat_id, content, role, timestamp)
SELECT id, chat_id, content, role, timestamp
FROM messages
WHERE chat_id IS NOT NULL AND channel_id IS NULL;

-- Move channel messages to channel_messages table
INSERT INTO channel_messages (id, channel_id, user_id, content, timestamp, is_edited, is_deleted, edited_at)
SELECT id, channel_id, user_id, content, timestamp, is_edited, is_deleted, edited_at
FROM messages
WHERE channel_id IS NOT NULL;

-- Move attachments to channel_attachments table
INSERT INTO channel_attachments (id, message_id, file_name, file_type, file_path, file_size, uploaded_at)
SELECT a.id, a.message_id, a.file_name, a.file_type, a.file_path, a.file_size, a.uploaded_at
FROM attachments a
JOIN messages m ON a.message_id = m.id
WHERE m.channel_id IS NOT NULL;

-- Create indexes
CREATE INDEX idx_chatbot_messages_chat_id ON chatbot_messages(chat_id);
CREATE INDEX idx_channel_messages_channel_id ON channel_messages(channel_id);
CREATE INDEX idx_channel_messages_user_id ON channel_messages(user_id);
CREATE INDEX idx_channel_attachments_message_id ON channel_attachments(message_id);

-- +migrate Down
-- Revert changes by dropping new tables
DROP TABLE IF EXISTS channel_attachments;
DROP TABLE IF EXISTS channel_messages;
DROP TABLE IF EXISTS chatbot_messages; 