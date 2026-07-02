CREATE TABLE IF NOT EXISTS places (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    category_id BIGINT NOT NULL,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    description TEXT,
    estimated_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    indoor BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    price_level VARCHAR(20),
    rating NUMERIC(2, 1),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_places_category
        FOREIGN KEY (category_id) REFERENCES place_categories(id)
);

CREATE TABLE IF NOT EXISTS place_tags (
    place_id BIGINT NOT NULL,
    tag VARCHAR(50) NOT NULL,
    PRIMARY KEY (place_id, tag),
    CONSTRAINT fk_place_tags_place
        FOREIGN KEY (place_id) REFERENCES places(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_places_city_active ON places(city, is_active);
CREATE INDEX IF NOT EXISTS idx_places_category_active ON places(category_id, is_active);
CREATE INDEX IF NOT EXISTS idx_places_city_cost ON places(city, estimated_cost, is_active);
CREATE INDEX IF NOT EXISTS idx_places_city_indoor ON places(city, indoor, is_active);
CREATE INDEX IF NOT EXISTS idx_places_location ON places USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_place_tags_tag ON place_tags(tag);
