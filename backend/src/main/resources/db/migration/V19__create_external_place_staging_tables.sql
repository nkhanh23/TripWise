ALTER TABLE place_import_runs
    ADD COLUMN IF NOT EXISTS release_date DATE,
    ADD COLUMN IF NOT EXISTS dataset_path TEXT,
    ADD COLUMN IF NOT EXISTS dry_run BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS total_input_rows BIGINT,
    ADD COLUMN IF NOT EXISTS total_valid_rows BIGINT,
    ADD COLUMN IF NOT EXISTS total_invalid_rows BIGINT,
    ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'ck_place_import_runs_total_input_rows'
    ) THEN
        ALTER TABLE place_import_runs
            ADD CONSTRAINT ck_place_import_runs_total_input_rows
            CHECK (total_input_rows IS NULL OR total_input_rows >= 0);
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'ck_place_import_runs_total_valid_rows'
    ) THEN
        ALTER TABLE place_import_runs
            ADD CONSTRAINT ck_place_import_runs_total_valid_rows
            CHECK (total_valid_rows IS NULL OR total_valid_rows >= 0);
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'ck_place_import_runs_total_invalid_rows'
    ) THEN
        ALTER TABLE place_import_runs
            ADD CONSTRAINT ck_place_import_runs_total_invalid_rows
            CHECK (total_invalid_rows IS NULL OR total_invalid_rows >= 0);
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS external_place_staging (
    id BIGSERIAL PRIMARY KEY,
    import_run_id BIGINT NOT NULL,
    source VARCHAR(50) NOT NULL,
    source_place_id VARCHAR(255) NOT NULL,
    source_release_date DATE,
    source_row_hash VARCHAR(64),
    name TEXT NOT NULL,
    normalized_name TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    geom geometry(Point, 4326),
    country_code VARCHAR(2),
    region TEXT,
    locality TEXT,
    address TEXT,
    postcode TEXT,
    website TEXT,
    telephone TEXT,
    email TEXT,
    place_type_draft VARCHAR(32) NOT NULL,
    category_confidence VARCHAR(20),
    needs_admin_review BOOLEAN NOT NULL DEFAULT TRUE,
    coordinate_status VARCHAR(32) NOT NULL,
    validation_status VARCHAR(32) NOT NULL,
    moderation_status VARCHAR(32) NOT NULL DEFAULT 'PENDING_ADMIN_REVIEW',
    dedup_status VARCHAR(32) NOT NULL DEFAULT 'NOT_CHECKED',
    raw_payload JSONB NOT NULL,
    mapping_payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_external_place_staging_import_run
        FOREIGN KEY (import_run_id) REFERENCES place_import_runs(id) ON DELETE CASCADE,
    CONSTRAINT ck_external_place_staging_latitude
        CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
    CONSTRAINT ck_external_place_staging_longitude
        CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180),
    CONSTRAINT ck_external_place_staging_place_type
        CHECK (place_type_draft IN ('FOOD', 'HOTEL', 'SERVICE', 'ATTRACTION', 'PENDING_ADMIN_REVIEW')),
    CONSTRAINT ck_external_place_staging_category_confidence
        CHECK (category_confidence IS NULL OR category_confidence IN ('LOW', 'MEDIUM', 'HIGH')),
    CONSTRAINT ck_external_place_staging_coordinate_status
        CHECK (coordinate_status IN ('VALID', 'MISSING', 'INVALID')),
    CONSTRAINT ck_external_place_staging_validation_status
        CHECK (validation_status IN ('VALID', 'WARNING', 'REJECTED')),
    CONSTRAINT ck_external_place_staging_moderation_status
        CHECK (moderation_status IN ('PENDING_ADMIN_REVIEW', 'APPROVED_FOR_APPLY', 'REJECTED', 'NEEDS_MORE_DATA')),
    CONSTRAINT ck_external_place_staging_dedup_status
        CHECK (dedup_status IN ('NOT_CHECKED', 'NO_MATCH', 'CANDIDATE_FOUND', 'CONFIRMED_DUPLICATE', 'CONFIRMED_DISTINCT')),
    CONSTRAINT ck_external_place_staging_geom_consistency
        CHECK (
            (coordinate_status = 'VALID' AND latitude IS NOT NULL AND longitude IS NOT NULL AND geom IS NOT NULL)
            OR (coordinate_status <> 'VALID' AND geom IS NULL)
        )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_external_place_staging_source_release_place
    ON external_place_staging (
        source,
        COALESCE(source_release_date, DATE '0001-01-01'),
        source_place_id
    );

CREATE UNIQUE INDEX IF NOT EXISTS uq_external_place_staging_run_place
    ON external_place_staging (import_run_id, source_place_id);

CREATE INDEX IF NOT EXISTS idx_external_place_staging_import_run_id
    ON external_place_staging (import_run_id);

CREATE INDEX IF NOT EXISTS idx_external_place_staging_source_place
    ON external_place_staging (source, source_place_id);

CREATE INDEX IF NOT EXISTS idx_external_place_staging_place_type
    ON external_place_staging (place_type_draft, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_external_place_staging_moderation_status
    ON external_place_staging (moderation_status, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_external_place_staging_dedup_status
    ON external_place_staging (dedup_status, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_external_place_staging_country_region_locality
    ON external_place_staging (country_code, region, locality);

CREATE INDEX IF NOT EXISTS idx_external_place_staging_normalized_name
    ON external_place_staging (normalized_name);

CREATE INDEX IF NOT EXISTS idx_external_place_staging_source_row_hash
    ON external_place_staging (source_row_hash)
    WHERE source_row_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_external_place_staging_valid_coordinate_status
    ON external_place_staging (coordinate_status, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_external_place_staging_validation_status
    ON external_place_staging (validation_status, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_external_place_staging_geom_gist
    ON external_place_staging
    USING GIST (geom)
    WHERE geom IS NOT NULL;

CREATE TABLE IF NOT EXISTS external_place_category_staging (
    id BIGSERIAL PRIMARY KEY,
    staging_place_id BIGINT NOT NULL,
    source_category_id VARCHAR(255) NOT NULL,
    category_label TEXT,
    category_path TEXT,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    raw_payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_external_place_category_staging_place
        FOREIGN KEY (staging_place_id) REFERENCES external_place_staging(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_external_place_category_staging_place_category
    ON external_place_category_staging (staging_place_id, source_category_id);

CREATE INDEX IF NOT EXISTS idx_external_place_category_staging_source_category_id
    ON external_place_category_staging (source_category_id);

CREATE INDEX IF NOT EXISTS idx_external_place_category_staging_category_label
    ON external_place_category_staging (category_label);

CREATE INDEX IF NOT EXISTS idx_external_place_category_staging_category_path
    ON external_place_category_staging (category_path);

CREATE TABLE IF NOT EXISTS external_place_dedup_candidates (
    id BIGSERIAL PRIMARY KEY,
    staging_place_id BIGINT NOT NULL,
    existing_place_id BIGINT,
    matched_staging_place_id BIGINT,
    match_type VARCHAR(40) NOT NULL,
    match_confidence VARCHAR(20) NOT NULL,
    distance_meters DOUBLE PRECISION,
    name_similarity DOUBLE PRECISION,
    category_similarity DOUBLE PRECISION,
    evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
    decision VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    decided_by BIGINT,
    decided_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_external_place_dedup_candidates_staging_place
        FOREIGN KEY (staging_place_id) REFERENCES external_place_staging(id) ON DELETE CASCADE,
    CONSTRAINT fk_external_place_dedup_candidates_existing_place
        FOREIGN KEY (existing_place_id) REFERENCES places(id) ON DELETE SET NULL,
    CONSTRAINT fk_external_place_dedup_candidates_matched_staging_place
        FOREIGN KEY (matched_staging_place_id) REFERENCES external_place_staging(id) ON DELETE CASCADE,
    CONSTRAINT fk_external_place_dedup_candidates_decided_by
        FOREIGN KEY (decided_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT ck_external_place_dedup_candidates_match_confidence
        CHECK (match_confidence IN ('LOW', 'MEDIUM', 'HIGH')),
    CONSTRAINT ck_external_place_dedup_candidates_name_similarity
        CHECK (name_similarity IS NULL OR (name_similarity >= 0 AND name_similarity <= 1)),
    CONSTRAINT ck_external_place_dedup_candidates_category_similarity
        CHECK (category_similarity IS NULL OR (category_similarity >= 0 AND category_similarity <= 1)),
    CONSTRAINT ck_external_place_dedup_candidates_distance_meters
        CHECK (distance_meters IS NULL OR distance_meters >= 0),
    CONSTRAINT ck_external_place_dedup_candidates_decision
        CHECK (decision IN ('PENDING', 'CONFIRMED_DUPLICATE', 'CONFIRMED_DISTINCT', 'REQUIRES_REVIEW'))
);

CREATE INDEX IF NOT EXISTS idx_external_place_dedup_candidates_staging_place_id
    ON external_place_dedup_candidates (staging_place_id);

CREATE INDEX IF NOT EXISTS idx_external_place_dedup_candidates_existing_place_id
    ON external_place_dedup_candidates (existing_place_id);

CREATE INDEX IF NOT EXISTS idx_external_place_dedup_candidates_matched_staging_place_id
    ON external_place_dedup_candidates (matched_staging_place_id);

CREATE INDEX IF NOT EXISTS idx_external_place_dedup_candidates_decision
    ON external_place_dedup_candidates (decision, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_external_place_dedup_candidates_match_confidence
    ON external_place_dedup_candidates (match_confidence, created_at DESC, id DESC);
