package com.tripwise.place.infrastructure.persistence;

import com.tripwise.place.application.dto.CityPipelineRunResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Timestamp;
import java.sql.Types;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class AdminCityPipelineJdbcRepository {

    private final JdbcTemplate jdbcTemplate;

    private final RowMapper<CityPipelineRunResponse> rowMapper = (rs, rowNum) -> CityPipelineRunResponse.builder()
            .id(rs.getLong("id"))
            .source(rs.getString("source"))
            .province(rs.getString("province"))
            .city(rs.getString("city"))
            .inputPath(rs.getString("input_path"))
            .importRunId(rs.getObject("import_run_id", Long.class))
            .releaseDate(rs.getString("release_date"))
            .bbox(rs.getString("bbox"))
            .limitCount(rs.getObject("limit_count", Integer.class))
            .step(rs.getString("step"))
            .dryRun(rs.getBoolean("dry_run"))
            .confirmWriteStaging(rs.getBoolean("confirm_write_staging"))
            .status(rs.getString("status"))
            .summaryText(rs.getString("summary_text"))
            .adminQueueUrl(rs.getString("admin_queue_url"))
            .startedAt(rs.getTimestamp("started_at") != null ? rs.getTimestamp("started_at").toInstant() : null)
            .finishedAt(rs.getTimestamp("finished_at") != null ? rs.getTimestamp("finished_at").toInstant() : null)
            .errorMessage(rs.getString("error_message"))
            .createdAt(rs.getTimestamp("created_at") != null ? rs.getTimestamp("created_at").toInstant() : null)
            .updatedAt(rs.getTimestamp("updated_at") != null ? rs.getTimestamp("updated_at").toInstant() : null)
            .build();

    public CityPipelineRunResponse insert(String source, String province, String city, String inputPath,
                                          Long importRunId, String releaseDate, String bbox, Integer limit,
                                          String step, boolean dryRun, boolean confirmWriteStaging) {
        String sql = """
                INSERT INTO admin_city_pipeline_runs
                    (source, province, city, input_path, import_run_id, release_date, bbox, limit_count,
                     step, dry_run, confirm_write_staging, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'QUEUED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """;
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(sql, new String[]{"id"});
            ps.setString(1, source);
            ps.setString(2, province);
            ps.setString(3, city);
            if (inputPath != null) {
                ps.setString(4, inputPath);
            } else {
                ps.setNull(4, Types.VARCHAR);
            }
            if (importRunId != null) {
                ps.setLong(5, importRunId);
            } else {
                ps.setNull(5, Types.BIGINT);
            }
            ps.setString(6, releaseDate != null ? releaseDate : "2026-06-11");
            if (bbox != null) {
                ps.setString(7, bbox);
            } else {
                ps.setNull(7, Types.VARCHAR);
            }
            if (limit != null) {
                ps.setInt(8, limit);
            } else {
                ps.setNull(8, Types.INTEGER);
            }
            ps.setString(9, step != null ? step : "all");
            ps.setBoolean(10, dryRun);
            ps.setBoolean(11, confirmWriteStaging);
            return ps;
        }, keyHolder);

        Number generatedId = keyHolder.getKey();
        if (generatedId == null) {
            throw new RuntimeException("Failed to insert pipeline run record");
        }
        return findById(generatedId.longValue())
                .orElseThrow(() -> new RuntimeException("Pipeline run not found after insert"));
    }

    public Optional<CityPipelineRunResponse> findById(Long id) {
        String sql = "SELECT * FROM admin_city_pipeline_runs WHERE id = ?";
        List<CityPipelineRunResponse> results = jdbcTemplate.query(sql, rowMapper, id);
        return results.isEmpty() ? Optional.empty() : Optional.of(results.get(0));
    }

    public List<CityPipelineRunResponse> findRecent(int limit, int offset) {
        String sql = "SELECT * FROM admin_city_pipeline_runs ORDER BY created_at DESC LIMIT ? OFFSET ?";
        return jdbcTemplate.query(sql, rowMapper, limit, offset);
    }

    public int countRuns() {
        String sql = "SELECT COUNT(*) FROM admin_city_pipeline_runs";
        Integer count = jdbcTemplate.queryForObject(sql, Integer.class);
        return count != null ? count : 0;
    }

    public void updateStatus(Long id, String status, Instant startedAt, Instant finishedAt) {
        String sql = """
                UPDATE admin_city_pipeline_runs
                SET status = ?, started_at = ?, finished_at = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """;
        jdbcTemplate.update(sql, status,
                startedAt != null ? Timestamp.from(startedAt) : null,
                finishedAt != null ? Timestamp.from(finishedAt) : null,
                id);
    }

    public void updateSummary(Long id, String summaryText, String adminQueueUrl) {
        String sql = """
                UPDATE admin_city_pipeline_runs
                SET summary_text = ?, admin_queue_url = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """;
        jdbcTemplate.update(sql, summaryText, adminQueueUrl, id);
    }

    /**
     * Update summary, adminQueueUrl, and optionally importRunId captured from CLI output.
     * importRunId may be null (e.g., dry-run or step != import) — in that case it is
     * left unchanged in the database to avoid overwriting a previously stored value.
     */
    public void updateSummaryAndImportRunId(Long id, String summaryText, String adminQueueUrl, Long capturedImportRunId) {
        if (capturedImportRunId != null) {
            String sql = """
                    UPDATE admin_city_pipeline_runs
                    SET summary_text = ?, admin_queue_url = ?, import_run_id = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                    """;
            jdbcTemplate.update(sql, summaryText, adminQueueUrl, capturedImportRunId, id);
        } else {
            // No importRunId to capture — only update summary and adminQueueUrl
            updateSummary(id, summaryText, adminQueueUrl);
        }
    }

    public void updateError(Long id, String errorMessage) {
        String sql = """
                UPDATE admin_city_pipeline_runs
                SET error_message = ?, status = 'FAILED', finished_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """;
        jdbcTemplate.update(sql, errorMessage, id);
    }
}
