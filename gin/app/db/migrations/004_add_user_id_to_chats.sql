-- chatsテーブルにuser_idカラムを追加
ALTER TABLE chats
ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- 既存のチャットにデフォルトのユーザーIDを設定（必要な場合）
-- この部分は実際の環境に応じて調整してください
UPDATE chats
SET user_id = (SELECT id FROM users LIMIT 1)
WHERE user_id IS NULL;

-- user_idカラムをNOT NULLに設定
ALTER TABLE chats
ALTER COLUMN user_id SET NOT NULL; 