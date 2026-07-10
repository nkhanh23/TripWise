package com.tripwise.place.infrastructure.persistence;

import com.tripwise.place.application.dto.AutoModerationExecutionReport.ExecutionRecord;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class AutoModerationAuditJdbcRepository {

    private final ObjectProvider<NamedParameterJdbcTemplate> jdbcTemplateProvider;

    public AutoModerationAuditJdbcRepository(ObjectProvider<NamedParameterJdbcTemplate> jdbcTemplateProvider) {
        this.jdbcTemplateProvider = jdbcTemplateProvider;
    }

    private NamedParameterJdbcTemplate jdbcTemplate() {
        NamedParameterJdbcTemplate template = jdbcTemplateProvider.getIfAvailable();
        if (template == null) {
            throw new IllegalStateException("NamedParameterJdbcTemplate is not available");
        }
        return template;
    }

    public long createBatch(String province, String city, int totalScanned, int published, int duplicate, int rejected, int skipped, int failed, long executionTimeMs, String batchReportJson) {
        String sql = """
                INSERT INTO auto_moderation_audit
                    (province, city, total_scanned, published_automatically, marked_duplicate, rejected, skipped_for_admin_review, failed, execution_time_ms, batch_report)
                VALUES
                    (:province, :city, :totalScanned, :published, :duplicate, :rejected, :skipped, :failed, :executionTimeMs, :batchReport::jsonb)
                RETURNING id
                """;
        return jdbcTemplate().queryForObject(
                sql,
                new MapSqlParameterSource()
                        .addValue("province", province)
                        .addValue("city", city)
                        .addValue("totalScanned", totalScanned)
                        .addValue("published", published)
                        .addValue("duplicate", duplicate)
                        .addValue("rejected", rejected)
                        .addValue("skipped", skipped)
                        .addValue("failed", failed)
                        .addValue("executionTimeMs", executionTimeMs)
                        .addValue("batchReport", batchReportJson),
                Long.class
        );
    }

    public void insertRecord(long batchId, Long stagingId, String name, String decision, String actionExecuted, String executionStatus, String failureReason, long executionDurationMs) {
        String sql = """
                INSERT INTO auto_moderation_audit_records
                    (batch_id, staging_id, decision, action_executed, execution_status, failure_reason, execution_duration_ms)
                VALUES
                    (:batchId, :stagingId, :decision, :actionExecuted, :executionStatus, :failureReason, :executionDurationMs)
                """;
        jdbcTemplate().update(
                sql,
                new MapSqlParameterSource()
                        .addValue("batchId", batchId)
                        .addValue("stagingId", stagingId)
                        .addValue("decision", decision)
                        .addValue("actionExecuted", actionExecuted)
                        .addValue("executionStatus", executionStatus)
                        .addValue("failureReason", failureReason)
                        .addValue("executionDurationMs", executionDurationMs)
        );
    }
}
