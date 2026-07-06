ALTER TABLE places
    ADD COLUMN IF NOT EXISTS place_type VARCHAR(30),
    ADD COLUMN IF NOT EXISTS quality_score INTEGER,
    ADD COLUMN IF NOT EXISTS is_recommendable BOOLEAN,
    ADD COLUMN IF NOT EXISTS reject_reason VARCHAR(255);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'ck_places_verification_status'
    ) THEN
        ALTER TABLE places DROP CONSTRAINT ck_places_verification_status;
    END IF;
END
$$;

UPDATE places
SET verification_status = CASE
        WHEN source = 'MANUAL_SEED' AND is_verified = TRUE THEN 'VERIFIED'
        WHEN verification_status = 'REJECTED' THEN 'REJECTED'
        ELSE 'PENDING'
    END,
    quality_score = COALESCE(quality_score, 0),
    is_recommendable = COALESCE(
        is_recommendable,
        CASE
            WHEN source = 'MANUAL_SEED' AND is_verified = TRUE THEN TRUE
            ELSE FALSE
        END
    )
WHERE verification_status NOT IN ('PENDING', 'AUTO_APPROVED', 'VERIFIED', 'REJECTED')
   OR verification_status IS NULL
   OR quality_score IS NULL
   OR is_recommendable IS NULL;

ALTER TABLE places
    ALTER COLUMN verification_status SET DEFAULT 'PENDING',
    ALTER COLUMN quality_score SET DEFAULT 0,
    ALTER COLUMN quality_score SET NOT NULL,
    ALTER COLUMN is_recommendable SET DEFAULT FALSE,
    ALTER COLUMN is_recommendable SET NOT NULL;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'ck_places_verification_status'
    ) THEN
        ALTER TABLE places DROP CONSTRAINT ck_places_verification_status;
    END IF;

    ALTER TABLE places
        ADD CONSTRAINT ck_places_verification_status
        CHECK (verification_status IN ('PENDING', 'AUTO_APPROVED', 'VERIFIED', 'REJECTED'));
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'ck_places_place_type'
    ) THEN
        ALTER TABLE places
            ADD CONSTRAINT ck_places_place_type
            CHECK (place_type IS NULL OR place_type IN ('ATTRACTION', 'FOOD', 'HOTEL', 'SERVICE', 'REJECTED'));
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_places_recommendable_active
    ON places (is_recommendable, is_active, verification_status);

ALTER TABLE place_data_sources
    ALTER COLUMN verification_status SET DEFAULT 'PENDING';

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'ck_place_data_sources_verification_status'
    ) THEN
        ALTER TABLE place_data_sources DROP CONSTRAINT ck_place_data_sources_verification_status;
    END IF;
END
$$;

UPDATE place_data_sources
SET verification_status = CASE
        WHEN source_name = 'MANUAL_SEED' THEN 'VERIFIED'
        WHEN verification_status = 'REJECTED' THEN 'REJECTED'
        ELSE 'PENDING'
    END
WHERE verification_status NOT IN ('PENDING', 'AUTO_APPROVED', 'VERIFIED', 'REJECTED')
   OR verification_status IS NULL;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'ck_place_data_sources_verification_status'
    ) THEN
        ALTER TABLE place_data_sources DROP CONSTRAINT ck_place_data_sources_verification_status;
    END IF;

    ALTER TABLE place_data_sources
        ADD CONSTRAINT ck_place_data_sources_verification_status
        CHECK (verification_status IN ('PENDING', 'AUTO_APPROVED', 'VERIFIED', 'REJECTED'));
END
$$;
