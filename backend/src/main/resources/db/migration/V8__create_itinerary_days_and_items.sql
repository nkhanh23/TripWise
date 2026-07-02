-- V8__create_itinerary_days_and_items.sql
-- Tạo bảng itinerary_days và itinerary_items cho lịch trình du lịch

CREATE TABLE IF NOT EXISTS itinerary_days (
    id BIGSERIAL PRIMARY KEY,
    trip_id BIGINT NOT NULL,
    day_number INTEGER NOT NULL,
    day_title VARCHAR(255),
    weather_summary VARCHAR(255),
    total_distance_meters INTEGER NOT NULL DEFAULT 0,
    total_duration_seconds INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_itinerary_days_trip FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
    CONSTRAINT uq_itinerary_days_trip_day UNIQUE (trip_id, day_number)
);

CREATE INDEX IF NOT EXISTS idx_itinerary_days_trip_id ON itinerary_days(trip_id);

CREATE TABLE IF NOT EXISTS itinerary_items (
    id BIGSERIAL PRIMARY KEY,
    itinerary_day_id BIGINT NOT NULL,
    place_id BIGINT NOT NULL,
    order_index INTEGER NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    time_slot VARCHAR(20) NOT NULL,
    reason TEXT,
    estimated_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    distance_from_previous_meters INTEGER NOT NULL DEFAULT 0,
    duration_from_previous_seconds INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_itinerary_items_day FOREIGN KEY (itinerary_day_id) REFERENCES itinerary_days(id) ON DELETE CASCADE,
    CONSTRAINT fk_itinerary_items_place FOREIGN KEY (place_id) REFERENCES places(id) ON DELETE RESTRICT,
    CONSTRAINT uq_itinerary_items_day_order UNIQUE (itinerary_day_id, order_index)
);

CREATE INDEX IF NOT EXISTS idx_itinerary_items_day_id ON itinerary_items(itinerary_day_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_items_place_id ON itinerary_items(place_id);
