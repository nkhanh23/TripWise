CREATE TABLE IF NOT EXISTS place_import_runs (
    id BIGSERIAL PRIMARY KEY,
    source_name VARCHAR(50) NOT NULL,
    input_file VARCHAR(1024) NOT NULL,
    import_mode VARCHAR(30) NOT NULL,
    status VARCHAR(30) NOT NULL,
    processed_count INTEGER NOT NULL DEFAULT 0,
    inserted_count INTEGER NOT NULL DEFAULT 0,
    updated_count INTEGER NOT NULL DEFAULT 0,
    deduplicated_count INTEGER NOT NULL DEFAULT 0,
    skipped_count INTEGER NOT NULL DEFAULT 0,
    error_count INTEGER NOT NULL DEFAULT 0,
    stale_marked_count INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_place_import_runs_mode
        CHECK (import_mode IN ('FULL_SYNC', 'UPSERT_ONLY')),
    CONSTRAINT ck_place_import_runs_status
        CHECK (status IN ('RUNNING', 'SUCCESS', 'FAILED'))
);

CREATE INDEX IF NOT EXISTS idx_place_import_runs_source_started_at
    ON place_import_runs (source_name, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_place_import_runs_status
    ON place_import_runs (status, started_at DESC);
