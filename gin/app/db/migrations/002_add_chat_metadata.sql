-- 既存のデータを保持したまま、新しいカラムを追加
ALTER TABLE chats
ADD COLUMN title TEXT,
ADD COLUMN last_message_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN message_count INTEGER DEFAULT 0;

-- 既存のチャットの last_message_at を最新のメッセージのタイムスタンプで更新
UPDATE chats c
SET last_message_at = (
    SELECT MAX(timestamp)
    FROM messages m
    WHERE m.chat_id = c.id
);

-- 既存のチャットの message_count を実際のメッセージ数で更新
UPDATE chats c
SET message_count = (
    SELECT COUNT(*)
    FROM messages m
    WHERE m.chat_id = c.id
);

-- title を最初のユーザーメッセージの先頭30文字で設定
UPDATE chats c
SET title = (
    SELECT LEFT(content, 30) || CASE WHEN LENGTH(content) > 30 THEN '...' ELSE '' END
    FROM messages m
    WHERE m.chat_id = c.id
    AND m.role = 'user'
    ORDER BY m.timestamp
    LIMIT 1
); 