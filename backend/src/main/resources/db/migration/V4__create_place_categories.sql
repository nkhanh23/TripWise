CREATE TABLE IF NOT EXISTS place_categories (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO place_categories (name, slug)
VALUES
    ('Biển', 'beach'),
    ('Ẩm thực', 'food'),
    ('Check-in', 'check-in'),
    ('Văn hóa', 'culture'),
    ('Giải trí', 'entertainment'),
    ('Thiên nhiên', 'nature'),
    ('Mua sắm', 'shopping'),
    ('Tâm linh', 'spiritual')
ON CONFLICT (slug) DO NOTHING;
