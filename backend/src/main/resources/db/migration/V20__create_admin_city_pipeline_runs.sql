CREATE TABLE admin_city_pipeline_runs (
    id BIGSERIAL PRIMARY KEY,
    source VARCHAR(50) NOT NULL,
    province VARCHAR(255) NOT NULL,
    city VARCHAR(255) NOT NULL,
    input_path TEXT,
    import_run_id BIGINT,
    release_date VARCHAR(20) DEFAULT '2026-06-11',
    bbox VARCHAR(255),
    limit_count INTEGER,
    step VARCHAR(50) DEFAULT 'all',
    dry_run BOOLEAN DEFAULT TRUE,
    confirm_write_staging BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) NOT NULL DEFAULT 'QUEUED',
    summary_text TEXT,
    admin_queue_url TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    finished_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pipeline_runs_status ON admin_city_pipeline_runs (status);
CREATE INDEX idx_pipeline_runs_source ON admin_city_pipeline_runs (source);
CREATE INDEX idx_pipeline_runs_created_at ON admin_city_pipeline_runs (created_at DESC);
