package com.tripwise.place.infrastructure.persistence;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@Repository
public class PlaceImportJdbcRepository {

    private final NamedParameterJdbcTemplate namedParameterJdbcTemplate;
    private final JdbcTemplate jdbcTemplate;

    public PlaceImportJdbcRepository(NamedParameterJdbcTemplate namedParameterJdbcTemplate, JdbcTemplate jdbcTemplate) {
        this.namedParameterJdbcTemplate = namedParameterJdbcTemplate;
        this.jdbcTemplate = jdbcTemplate;
    }

    public long createImportRun(String sourceName, String inputFile, String importMode, Instant startedAt) {
        String sql = """
                INSERT INTO place_import_runs (
                    source_name,
                    input_file,
                    import_mode,
                    status,
                    started_at,
                    created_at,
                    updated_at
                )
                VALUES (
                    :sourceName,
                    :inputFile,
                    :importMode,
                    'RUNNING',
                    :startedAt,
                    CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP
                )
                RETURNING id
                """;

        MapSqlParameterSource parameters = new MapSqlParameterSource()
                .addValue("sourceName", sourceName)
                .addValue("inputFile", inputFile)
                .addValue("importMode", importMode)
                .addValue("startedAt", Timestamp.from(startedAt));

        Long runId = namedParameterJdbcTemplate.queryForObject(sql, parameters, Long.class);
        if (runId == null) {
            throw new IllegalStateException("Failed to create place import run");
        }
        return runId;
    }

    public void completeImportRun(
            long runId,
            String status,
            int processedCount,
            int insertedCount,
            int updatedCount,
            int deduplicatedCount,
            int skippedCount,
            int errorCount,
            int staleMarkedCount,
            String notes,
            Instant finishedAt
    ) {
        String sql = """
                UPDATE place_import_runs
                SET status = :status,
                    processed_count = :processedCount,
                    inserted_count = :insertedCount,
                    updated_count = :updatedCount,
                    deduplicated_count = :deduplicatedCount,
                    skipped_count = :skippedCount,
                    error_count = :errorCount,
                    stale_marked_count = :staleMarkedCount,
                    notes = :notes,
                    finished_at = :finishedAt,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = :runId
                """;

        namedParameterJdbcTemplate.update(sql, new MapSqlParameterSource()
                .addValue("runId", runId)
                .addValue("status", status)
                .addValue("processedCount", processedCount)
                .addValue("insertedCount", insertedCount)
                .addValue("updatedCount", updatedCount)
                .addValue("deduplicatedCount", deduplicatedCount)
                .addValue("skippedCount", skippedCount)
                .addValue("errorCount", errorCount)
                .addValue("staleMarkedCount", staleMarkedCount)
                .addValue("notes", notes)
                .addValue("finishedAt", Timestamp.from(finishedAt)));
    }

    public void markSourceRowsPendingStale(String sourceName, Instant markerTimestamp) {
        String sql = """
                UPDATE places
                SET stale_at = :markerTimestamp,
                    updated_at = CURRENT_TIMESTAMP
                WHERE source = :sourceName
                """;

        namedParameterJdbcTemplate.update(sql, new MapSqlParameterSource()
                .addValue("sourceName", sourceName)
                .addValue("markerTimestamp", Timestamp.from(markerTimestamp)));
    }

    public void clearPendingStaleMarker(String sourceName, Instant markerTimestamp) {
        String sql = """
                UPDATE places
                SET stale_at = NULL,
                    updated_at = CURRENT_TIMESTAMP
                WHERE source = :sourceName
                  AND stale_at = :markerTimestamp
                """;

        namedParameterJdbcTemplate.update(sql, new MapSqlParameterSource()
                .addValue("sourceName", sourceName)
                .addValue("markerTimestamp", Timestamp.from(markerTimestamp)));
    }

    public int deactivateStaleRows(String sourceName, Instant markerTimestamp) {
        String sql = """
                UPDATE places
                SET is_active = FALSE,
                    stale_at = :markerTimestamp,
                    updated_at = CURRENT_TIMESTAMP
                WHERE source = :sourceName
                  AND stale_at = :markerTimestamp
                  AND is_active = TRUE
                """;

        return namedParameterJdbcTemplate.update(sql, new MapSqlParameterSource()
                .addValue("sourceName", sourceName)
                .addValue("markerTimestamp", Timestamp.from(markerTimestamp)));
    }

    public Optional<ExistingPlaceRecord> findBySourceAndExternalId(String sourceName, String sourceExternalId) {
        String sql = """
                SELECT id,
                       source,
                       source_external_id,
                       verification_status,
                       is_verified
                FROM places
                WHERE source = :sourceName
                  AND source_external_id = :sourceExternalId
                LIMIT 1
                """;

        List<ExistingPlaceRecord> rows = namedParameterJdbcTemplate.query(
                sql,
                new MapSqlParameterSource()
                        .addValue("sourceName", sourceName)
                        .addValue("sourceExternalId", sourceExternalId),
                this::mapExistingPlace
        );
        return rows.stream().findFirst();
    }

    public Optional<ExistingPlaceRecord> findDuplicateByNameAndLocation(
            String name,
            String province,
            String city,
            double latitude,
            double longitude,
            double dedupeRadiusMeters
    ) {
        String sql = """
                SELECT id,
                       source,
                       source_external_id,
                       verification_status,
                       is_verified
                FROM places
                WHERE LOWER(name) = LOWER(:name)
                  AND (CAST(:province AS VARCHAR) IS NULL OR province IS NULL OR LOWER(province) = LOWER(:province))
                  AND (CAST(:city AS VARCHAR) IS NULL OR LOWER(city) = LOWER(:city))
                  AND ST_DWithin(
                      location,
                      ST_GeogFromText(CONCAT('SRID=4326;POINT(', :longitude, ' ', :latitude, ')')),
                      :dedupeRadiusMeters
                  )
                ORDER BY CASE WHEN verification_status = 'VERIFIED' THEN 0 ELSE 1 END,
                         ST_Distance(
                             location,
                             ST_GeogFromText(CONCAT('SRID=4326;POINT(', :longitude, ' ', :latitude, ')'))
                         ) ASC
                LIMIT 1
                """;

        List<ExistingPlaceRecord> rows = namedParameterJdbcTemplate.query(
                sql,
                new MapSqlParameterSource()
                        .addValue("name", name)
                        .addValue("province", province)
                        .addValue("city", city)
                        .addValue("latitude", latitude)
                        .addValue("longitude", longitude)
                        .addValue("dedupeRadiusMeters", dedupeRadiusMeters),
                this::mapExistingPlace
        );
        return rows.stream().findFirst();
    }

    public long insertPlace(
            String sourceName,
            String sourceExternalId,
            String name,
            String province,
            String city,
            String district,
            String ward,
            String displayAddress,
            long categoryId,
            double latitude,
            double longitude,
            String description,
            BigDecimal estimatedCost,
            int durationMinutes,
            boolean indoor,
            boolean active,
            boolean verified,
            String priceLevel,
            String rawTagsJson,
            String verificationStatus,
            Instant syncedAt
    ) {
        String sql = """
                INSERT INTO places (
                    name,
                    province,
                    city,
                    district,
                    ward,
                    display_address,
                    category_id,
                    location,
                    description,
                    estimated_cost,
                    duration_minutes,
                    indoor,
                    is_active,
                    is_verified,
                    price_level,
                    source,
                    source_external_id,
                    raw_tags,
                    verification_status,
                    last_synced_at,
                    stale_at,
                    created_at,
                    updated_at
                )
                VALUES (
                    :name,
                    :province,
                    :city,
                    :district,
                    :ward,
                    :displayAddress,
                    :categoryId,
                    ST_GeogFromText(CONCAT('SRID=4326;POINT(', :longitude, ' ', :latitude, ')')),
                    :description,
                    :estimatedCost,
                    :durationMinutes,
                    :indoor,
                    :active,
                    :verified,
                    :priceLevel,
                    :sourceName,
                    :sourceExternalId,
                    CAST(:rawTagsJson AS jsonb),
                    :verificationStatus,
                    :syncedAt,
                    NULL,
                    CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP
                )
                RETURNING id
                """;

        MapSqlParameterSource parameters = new MapSqlParameterSource()
                .addValue("name", name)
                .addValue("province", province)
                .addValue("city", city)
                .addValue("district", district)
                .addValue("ward", ward)
                .addValue("displayAddress", displayAddress)
                .addValue("categoryId", categoryId)
                .addValue("longitude", longitude)
                .addValue("latitude", latitude)
                .addValue("description", description)
                .addValue("estimatedCost", estimatedCost)
                .addValue("durationMinutes", durationMinutes)
                .addValue("indoor", indoor)
                .addValue("active", active)
                .addValue("verified", verified)
                .addValue("priceLevel", priceLevel)
                .addValue("sourceName", sourceName)
                .addValue("sourceExternalId", sourceExternalId)
                .addValue("rawTagsJson", rawTagsJson)
                .addValue("verificationStatus", verificationStatus)
                .addValue("syncedAt", Timestamp.from(syncedAt));

        Long placeId = namedParameterJdbcTemplate.queryForObject(sql, parameters, Long.class);
        if (placeId == null) {
            throw new IllegalStateException("Failed to insert imported place");
        }
        return placeId;
    }

    public void updateSourceOwnedPlace(
            long placeId,
            String sourceExternalId,
            String name,
            String province,
            String city,
            String district,
            String ward,
            String displayAddress,
            long categoryId,
            double latitude,
            double longitude,
            String description,
            BigDecimal estimatedCost,
            int durationMinutes,
            boolean indoor,
            boolean active,
            boolean verified,
            String priceLevel,
            String rawTagsJson,
            String verificationStatus,
            Instant syncedAt
    ) {
        String sql = """
                UPDATE places
                SET name = :name,
                    province = :province,
                    city = :city,
                    district = :district,
                    ward = :ward,
                    display_address = :displayAddress,
                    category_id = :categoryId,
                    location = ST_GeogFromText(CONCAT('SRID=4326;POINT(', :longitude, ' ', :latitude, ')')),
                    description = :description,
                    estimated_cost = :estimatedCost,
                    duration_minutes = :durationMinutes,
                    indoor = :indoor,
                    is_active = :active,
                    is_verified = :verified,
                    price_level = :priceLevel,
                    source_external_id = :sourceExternalId,
                    raw_tags = CAST(:rawTagsJson AS jsonb),
                    verification_status = :verificationStatus,
                    last_synced_at = :syncedAt,
                    stale_at = NULL,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = :placeId
                """;

        namedParameterJdbcTemplate.update(sql, new MapSqlParameterSource()
                .addValue("placeId", placeId)
                .addValue("name", name)
                .addValue("province", province)
                .addValue("city", city)
                .addValue("district", district)
                .addValue("ward", ward)
                .addValue("displayAddress", displayAddress)
                .addValue("categoryId", categoryId)
                .addValue("longitude", longitude)
                .addValue("latitude", latitude)
                .addValue("description", description)
                .addValue("estimatedCost", estimatedCost)
                .addValue("durationMinutes", durationMinutes)
                .addValue("indoor", indoor)
                .addValue("active", active)
                .addValue("verified", verified)
                .addValue("priceLevel", priceLevel)
                .addValue("sourceExternalId", sourceExternalId)
                .addValue("rawTagsJson", rawTagsJson)
                .addValue("verificationStatus", verificationStatus)
                .addValue("syncedAt", Timestamp.from(syncedAt)));
    }

    public void mergeIntoDuplicatePlace(
            long placeId,
            String province,
            String city,
            String district,
            String ward,
            String displayAddress,
            String description,
            BigDecimal estimatedCost,
            Integer durationMinutes,
            Boolean indoor,
            Boolean active,
            String priceLevel,
            String rawTagsJson,
            String verificationStatus,
            boolean verified,
            Instant syncedAt
    ) {
        String sql = """
                UPDATE places
                SET province = COALESCE(province, :province),
                    city = CASE
                        WHEN city IS NULL OR city = '' THEN :city
                        ELSE city
                    END,
                    district = COALESCE(district, :district),
                    ward = COALESCE(ward, :ward),
                    display_address = COALESCE(display_address, :displayAddress),
                    description = COALESCE(description, :description),
                    estimated_cost = CASE
                        WHEN estimated_cost = 0 AND :estimatedCost IS NOT NULL THEN :estimatedCost
                        ELSE estimated_cost
                    END,
                    duration_minutes = CASE
                        WHEN duration_minutes = 60 AND :durationMinutes IS NOT NULL THEN :durationMinutes
                        ELSE duration_minutes
                    END,
                    indoor = CASE
                        WHEN :indoor IS NOT NULL THEN :indoor
                        ELSE indoor
                    END,
                    is_active = CASE
                        WHEN :active IS NOT NULL THEN :active
                        ELSE is_active
                    END,
                    is_verified = CASE
                        WHEN is_verified = TRUE THEN TRUE
                        ELSE :verified
                    END,
                    price_level = COALESCE(price_level, :priceLevel),
                    raw_tags = COALESCE(raw_tags, '{}'::jsonb) || CAST(:rawTagsJson AS jsonb),
                    verification_status = CASE
                        WHEN verification_status = 'VERIFIED' THEN verification_status
                        ELSE :verificationStatus
                    END,
                    last_synced_at = :syncedAt,
                    stale_at = NULL,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = :placeId
                """;

        namedParameterJdbcTemplate.update(sql, new MapSqlParameterSource()
                .addValue("placeId", placeId)
                .addValue("province", province)
                .addValue("city", city)
                .addValue("district", district)
                .addValue("ward", ward)
                .addValue("displayAddress", displayAddress)
                .addValue("description", description)
                .addValue("estimatedCost", estimatedCost)
                .addValue("durationMinutes", durationMinutes)
                .addValue("indoor", indoor)
                .addValue("active", active)
                .addValue("verified", verified)
                .addValue("priceLevel", priceLevel)
                .addValue("rawTagsJson", rawTagsJson)
                .addValue("verificationStatus", verificationStatus)
                .addValue("syncedAt", Timestamp.from(syncedAt)));
    }

    public void replaceTags(long placeId, Set<String> tags) {
        jdbcTemplate.update("DELETE FROM place_tags WHERE place_id = ?", placeId);
        if (tags == null || tags.isEmpty()) {
            return;
        }
        jdbcTemplate.batchUpdate(
                "INSERT INTO place_tags (place_id, tag) VALUES (?, ?)",
                tags,
                tags.size(),
                (preparedStatement, tag) -> {
                    preparedStatement.setLong(1, placeId);
                    preparedStatement.setString(2, tag);
                }
        );
    }

    public void upsertPlaceDataSource(
            long placeId,
            String sourceName,
            String sourceReference,
            String verificationStatus,
            String notes,
            Instant syncedAt
    ) {
        String sql = """
                INSERT INTO place_data_sources (
                    place_id,
                    field_group,
                    source_name,
                    source_reference,
                    verification_status,
                    confidence_level,
                    synced_at,
                    notes,
                    created_at,
                    updated_at
                )
                VALUES (
                    :placeId,
                    'CORE',
                    :sourceName,
                    :sourceReference,
                    :verificationStatus,
                    'MEDIUM',
                    :syncedAt,
                    :notes,
                    CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP
                )
                ON CONFLICT (place_id, field_group, source_name, source_reference)
                WHERE source_reference IS NOT NULL
                DO UPDATE SET
                    verification_status = EXCLUDED.verification_status,
                    confidence_level = EXCLUDED.confidence_level,
                    synced_at = EXCLUDED.synced_at,
                    notes = EXCLUDED.notes,
                    updated_at = CURRENT_TIMESTAMP
                """;

        namedParameterJdbcTemplate.update(sql, new MapSqlParameterSource()
                .addValue("placeId", placeId)
                .addValue("sourceName", sourceName)
                .addValue("sourceReference", sourceReference)
                .addValue("verificationStatus", verificationStatus)
                .addValue("notes", notes)
                .addValue("syncedAt", Timestamp.from(syncedAt)));
    }

    private ExistingPlaceRecord mapExistingPlace(ResultSet resultSet, int rowNum) throws SQLException {
        return new ExistingPlaceRecord(
                resultSet.getLong("id"),
                resultSet.getString("source"),
                resultSet.getString("source_external_id"),
                resultSet.getString("verification_status"),
                resultSet.getBoolean("is_verified")
        );
    }

    public record ExistingPlaceRecord(
            long id,
            String source,
            String sourceExternalId,
            String verificationStatus,
            boolean verified
    ) {
    }
}
