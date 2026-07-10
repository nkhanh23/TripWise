CREATE TABLE IF NOT EXISTS auto_moderation_audit (
    id BIGSERIAL PRIMARY KEY,
    province VARCHAR(255) NOT NULL,
    city VARCHAR(255) NOT NULL,
    batch_executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total_scanned INT NOT NULL,
    published_automatically INT NOT NULL DEFAULT 0,
    marked_duplicate INT NOT NULL DEFAULT 0,
    rejected INT NOT NULL DEFAULT 0,
    skipped_for_admin_review INT NOT NULL DEFAULT 0,
    failed INT NOT NULL DEFAULT 0,
    execution_time_ms BIGINT NOT NULL DEFAULT 0,
    batch_report JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_auto_moderation_audit_location
    ON auto_moderation_audit (province, city, batch_executed_at DESC);

CREATE TABLE IF NOT EXISTS auto_moderation_audit_records (
    id BIGSERIAL PRIMARY KEY,
    batch_id BIGINT NOT NULL,
    staging_id BIGINT NOT NULL,
    decision VARCHAR(32) NOT NULL,
    action_executed VARCHAR(32) NOT NULL,
    execution_status VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    failure_reason TEXT,
    execution_duration_ms BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_auto_moderation_audit_records_batch
        FOREIGN KEY (batch_id) REFERENCES auto_moderation_audit(id) ON DELETE CASCADE,
    CONSTRAINT ck_auto_moderation_audit_records_decision
        CHECK (decision IN ('AUTO_APPROVE', 'AUTO_DUPLICATE', 'AUTO_REJECT', 'NEEDS_ADMIN_REVIEW')),
    CONSTRAINT ck_auto_moderation_audit_records_action
        CHECK (action_executed IN ('PUBLISH', 'DUPLICATE', 'REJECT', 'SKIP', 'FAILED')),
    CONSTRAINT ck_auto_moderation_audit_records_status
        CHECK (execution_status IN ('SUCCESS', 'FAILED'))
);

CREATE INDEX IF NOT EXISTS idx_auto_moderation_audit_records_batch
    ON auto_moderation_audit_records (batch_id);

CREATE INDEX IF NOT EXISTS idx_auto_moderation_audit_records_staging
    ON auto_moderation_audit_records (staging_id);
