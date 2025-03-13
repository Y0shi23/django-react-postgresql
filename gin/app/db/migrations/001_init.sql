-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY,
    server_id UUID NOT NULL,
    name VARCHAR(50) NOT NULL,
    position INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE
);

-- Add category_id column to channels table
ALTER TABLE channels ADD COLUMN IF NOT EXISTS category_id UUID NULL;
ALTER TABLE channels ADD CONSTRAINT fk_channels_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL; 