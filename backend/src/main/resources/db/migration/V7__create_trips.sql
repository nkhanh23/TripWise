-- V7__create_trips.sql
CREATE TABLE IF NOT EXISTS trips (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    destination VARCHAR(255) NOT NULL,
    start_date DATE,
    days INTEGER NOT NULL,
    nights INTEGER NOT NULL DEFAULT 0,
    budget VARCHAR(50),
    travel_style VARCHAR(50),
    interests TEXT[],
    preferences TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    ai_metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_trips_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_trips_user_id ON trips(user_id);
