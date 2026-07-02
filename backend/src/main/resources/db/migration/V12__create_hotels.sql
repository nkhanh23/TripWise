CREATE TABLE IF NOT EXISTS hotels (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    price_level VARCHAR(20) NOT NULL,
    google_maps_url VARCHAR(255),
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hotels_city_active ON hotels(city, is_active);
CREATE INDEX IF NOT EXISTS idx_hotels_location ON hotels USING GIST (location);
