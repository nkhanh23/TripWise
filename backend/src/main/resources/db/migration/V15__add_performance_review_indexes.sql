CREATE INDEX IF NOT EXISTS idx_places_city_active_verified_ci
    ON places (LOWER(city), is_active, is_verified);

CREATE INDEX IF NOT EXISTS idx_trips_user_created_at_desc
    ON trips (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_hotels_city_active_star_name_ci
    ON hotels (LOWER(city), is_active, star_rating DESC, name ASC);

CREATE INDEX IF NOT EXISTS idx_hotels_city_price_active_star_name_ci
    ON hotels (LOWER(city), LOWER(price_level), is_active, star_rating DESC, name ASC);
