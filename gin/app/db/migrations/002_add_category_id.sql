-- Add category_id column to channels table
ALTER TABLE channels ADD COLUMN IF NOT EXISTS category_id UUID NULL;

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_channels_category'
    ) THEN
        ALTER TABLE channels ADD CONSTRAINT fk_channels_category 
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;
    END IF;
END
$$; 