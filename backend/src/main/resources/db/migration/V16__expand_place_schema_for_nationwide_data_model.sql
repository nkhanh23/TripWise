ALTER TABLE places
    ADD COLUMN IF NOT EXISTS province VARCHAR(100),
    ADD COLUMN IF NOT EXISTS district VARCHAR(100),
    ADD COLUMN IF NOT EXISTS ward VARCHAR(100),
    ADD COLUMN IF NOT EXISTS display_address VARCHAR(255),
    ADD COLUMN IF NOT EXISTS source VARCHAR(50),
    ADD COLUMN IF NOT EXISTS source_external_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS raw_tags JSONB,
    ADD COLUMN IF NOT EXISTS verification_status VARCHAR(30),
    ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS stale_at TIMESTAMP WITH TIME ZONE;

UPDATE places
SET source = COALESCE(source, 'MANUAL_SEED'),
    raw_tags = COALESCE(raw_tags, '{}'::jsonb),
    verification_status = COALESCE(
        verification_status,
        CASE
            WHEN is_verified = TRUE THEN 'VERIFIED'
            ELSE 'UNVERIFIED'
        END
    ),
    province = CASE
        WHEN province IS NULL AND city = 'Nha Trang' THEN 'Khanh Hoa'
        ELSE province
    END
WHERE source IS NULL
   OR raw_tags IS NULL
   OR verification_status IS NULL
   OR (province IS NULL AND city = 'Nha Trang');

ALTER TABLE places
    ALTER COLUMN source SET NOT NULL,
    ALTER COLUMN source SET DEFAULT 'MANUAL',
    ALTER COLUMN raw_tags SET NOT NULL,
    ALTER COLUMN raw_tags SET DEFAULT '{}'::jsonb,
    ALTER COLUMN verification_status SET NOT NULL,
    ALTER COLUMN verification_status SET DEFAULT 'UNVERIFIED';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'ck_places_verification_status'
    ) THEN
        ALTER TABLE places
            ADD CONSTRAINT ck_places_verification_status
            CHECK (verification_status IN ('UNVERIFIED', 'PARTIALLY_VERIFIED', 'VERIFIED', 'REJECTED', 'NEEDS_REVIEW'));
    END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_places_source_external_id
    ON places (source, source_external_id)
    WHERE source_external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_places_province_city_category_active
    ON places (province, city, category_id, is_active);

CREATE INDEX IF NOT EXISTS idx_places_verification_status_active
    ON places (verification_status, is_active);

CREATE INDEX IF NOT EXISTS idx_places_source_last_synced_at
    ON places (source, last_synced_at);

CREATE INDEX IF NOT EXISTS idx_places_raw_tags_gin
    ON places
    USING GIN (raw_tags jsonb_path_ops);

CREATE TABLE IF NOT EXISTS place_enrichments (
    place_id BIGINT PRIMARY KEY,
    provider_name VARCHAR(50) NOT NULL,
    provider_place_id VARCHAR(255),
    rating NUMERIC(2, 1),
    review_count INTEGER,
    opening_hours JSONB,
    price_level VARCHAR(20),
    ticket_price_min NUMERIC(12, 2),
    ticket_price_max NUMERIC(12, 2),
    confidence_level VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    provider_updated_at TIMESTAMP WITH TIME ZONE,
    synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_place_enrichments_place
        FOREIGN KEY (place_id) REFERENCES places(id) ON DELETE CASCADE,
    CONSTRAINT ck_place_enrichments_confidence
        CHECK (confidence_level IN ('LOW', 'MEDIUM', 'HIGH')),
    CONSTRAINT ck_place_enrichments_review_count
        CHECK (review_count IS NULL OR review_count >= 0),
    CONSTRAINT ck_place_enrichments_ticket_price_range
        CHECK (
            ticket_price_min IS NULL
            OR ticket_price_max IS NULL
            OR ticket_price_max >= ticket_price_min
        )
);

CREATE INDEX IF NOT EXISTS idx_place_enrichments_rating_review_count
    ON place_enrichments (rating, review_count);

CREATE INDEX IF NOT EXISTS idx_place_enrichments_provider_name
    ON place_enrichments (provider_name);

CREATE TABLE IF NOT EXISTS place_images (
    id BIGSERIAL PRIMARY KEY,
    place_id BIGINT NOT NULL,
    image_url VARCHAR(1024) NOT NULL,
    source_name VARCHAR(50) NOT NULL,
    source_image_id VARCHAR(255),
    attribution_text VARCHAR(255),
    license_name VARCHAR(100),
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_place_images_place
        FOREIGN KEY (place_id) REFERENCES places(id) ON DELETE CASCADE,
    CONSTRAINT ck_place_images_display_order
        CHECK (display_order >= 0)
);

CREATE INDEX IF NOT EXISTS idx_place_images_place_id_order
    ON place_images (place_id, display_order);

CREATE UNIQUE INDEX IF NOT EXISTS uq_place_images_primary_per_place
    ON place_images (place_id)
    WHERE is_primary = TRUE;

CREATE TABLE IF NOT EXISTS place_editorial_contents (
    place_id BIGINT PRIMARY KEY,
    short_description TEXT,
    travel_highlights TEXT,
    best_time VARCHAR(100),
    visit_duration_minutes INTEGER,
    tips TEXT,
    family_fit VARCHAR(20) NOT NULL DEFAULT 'UNKNOWN',
    couple_fit VARCHAR(20) NOT NULL DEFAULT 'UNKNOWN',
    student_fit VARCHAR(20) NOT NULL DEFAULT 'UNKNOWN',
    editorial_status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    reviewed_by_user_id BIGINT,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_place_editorial_contents_place
        FOREIGN KEY (place_id) REFERENCES places(id) ON DELETE CASCADE,
    CONSTRAINT fk_place_editorial_contents_reviewer
        FOREIGN KEY (reviewed_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT ck_place_editorial_contents_visit_duration
        CHECK (visit_duration_minutes IS NULL OR visit_duration_minutes > 0),
    CONSTRAINT ck_place_editorial_contents_family_fit
        CHECK (family_fit IN ('UNKNOWN', 'LOW', 'MEDIUM', 'HIGH')),
    CONSTRAINT ck_place_editorial_contents_couple_fit
        CHECK (couple_fit IN ('UNKNOWN', 'LOW', 'MEDIUM', 'HIGH')),
    CONSTRAINT ck_place_editorial_contents_student_fit
        CHECK (student_fit IN ('UNKNOWN', 'LOW', 'MEDIUM', 'HIGH')),
    CONSTRAINT ck_place_editorial_contents_status
        CHECK (editorial_status IN ('DRAFT', 'REVIEWED', 'PUBLISHED', 'ARCHIVED'))
);

CREATE INDEX IF NOT EXISTS idx_place_editorial_contents_status
    ON place_editorial_contents (editorial_status);

CREATE TABLE IF NOT EXISTS place_popularity_metrics (
    place_id BIGINT PRIMARY KEY,
    popularity_score NUMERIC(8, 2) NOT NULL DEFAULT 0,
    tripwise_score NUMERIC(8, 2) NOT NULL DEFAULT 0,
    saved_count BIGINT NOT NULL DEFAULT 0,
    itinerary_pick_count BIGINT NOT NULL DEFAULT 0,
    detail_view_count BIGINT NOT NULL DEFAULT 0,
    last_interaction_at TIMESTAMP WITH TIME ZONE,
    computed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_place_popularity_metrics_place
        FOREIGN KEY (place_id) REFERENCES places(id) ON DELETE CASCADE,
    CONSTRAINT ck_place_popularity_metrics_saved_count
        CHECK (saved_count >= 0),
    CONSTRAINT ck_place_popularity_metrics_itinerary_pick_count
        CHECK (itinerary_pick_count >= 0),
    CONSTRAINT ck_place_popularity_metrics_detail_view_count
        CHECK (detail_view_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_place_popularity_metrics_popularity
    ON place_popularity_metrics (popularity_score);

CREATE INDEX IF NOT EXISTS idx_place_popularity_metrics_tripwise
    ON place_popularity_metrics (tripwise_score);

CREATE TABLE IF NOT EXISTS place_data_sources (
    id BIGSERIAL PRIMARY KEY,
    place_id BIGINT NOT NULL,
    field_group VARCHAR(50) NOT NULL,
    source_name VARCHAR(50) NOT NULL,
    source_reference VARCHAR(255),
    source_url VARCHAR(1024),
    verification_status VARCHAR(30) NOT NULL DEFAULT 'UNVERIFIED',
    confidence_level VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    synced_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_place_data_sources_place
        FOREIGN KEY (place_id) REFERENCES places(id) ON DELETE CASCADE,
    CONSTRAINT ck_place_data_sources_field_group
        CHECK (field_group IN ('CORE', 'ENRICHMENT', 'EDITORIAL', 'IMAGE', 'DERIVED')),
    CONSTRAINT ck_place_data_sources_verification_status
        CHECK (verification_status IN ('UNVERIFIED', 'PARTIALLY_VERIFIED', 'VERIFIED', 'REJECTED', 'NEEDS_REVIEW')),
    CONSTRAINT ck_place_data_sources_confidence
        CHECK (confidence_level IN ('LOW', 'MEDIUM', 'HIGH'))
);

CREATE INDEX IF NOT EXISTS idx_place_data_sources_place_group
    ON place_data_sources (place_id, field_group);

CREATE INDEX IF NOT EXISTS idx_place_data_sources_source_name
    ON place_data_sources (source_name);

CREATE UNIQUE INDEX IF NOT EXISTS uq_place_data_sources_reference
    ON place_data_sources (place_id, field_group, source_name, source_reference)
    WHERE source_reference IS NOT NULL;
