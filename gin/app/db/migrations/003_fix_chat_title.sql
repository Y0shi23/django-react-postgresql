-- 一旦テーブルを削除（データは失われます）
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS chats;

-- チャットテーブルを再作成
CREATE TABLE chats (
    id UUID PRIMARY KEY,
    title TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    message_count INTEGER DEFAULT 0
);

-- メッセージテーブルを再作成
CREATE TABLE messages (
    id UUID PRIMARY KEY,
    chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    role VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- インデックスを作成
CREATE INDEX idx_messages_chat_id ON messages(chat_id); 