package com.tripwise.place.infrastructure.persistence;

import com.tripwise.place.application.dto.PlaceModerationBackfillScope;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowCallbackHandler;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.core.namedparam.SqlParameterSource;
import org.springframework.jdbc.core.namedparam.SqlParameterSourceUtils;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.sql.Types;
import java.time.Instant;
import java.text.Normalizer;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Consumer;

@Repository
public class PlaceImportJdbcRepository {

    private static final Set<String> ALLOWED_PLACE_TYPES = Set.of(
            "ATTRACTION",
            "FOOD",
            "HOTEL",
            "SERVICE",
            "REJECTED"
    );
    private static final Set<String> ALLOWED_VERIFICATION_STATUSES = Set.of(
            "PENDING",
            "AUTO_APPROVED",
            "VERIFIED",
            "REJECTED"
    );
    private static final Set<String> HO_CHI_MINH_ALIAS_KEYS = Set.of(
            "ho chi minh",
            "ho chi minh city",
            "thanh pho ho chi minh",
            "tp ho chi minh",
            "tphcm",
            "hcm",
            "saigon",
            "sai gon",
            "thu duc",
            "thanh pho thu duc"
    );
    private static final List<String> HO_CHI_MINH_CITY_DB_ALIASES = List.of(
            "hồ chí minh",
            "ho chi minh",
            "ho chi minh city",
            "thành phố hồ chí minh",
            "thủ đức",
            "thành phố thủ đức"
    );
    private static final List<String> HO_CHI_MINH_PROVINCE_DB_ALIASES = List.of(
            "hồ chí minh",
            "thành phố hồ chí minh"
    );

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
                ORDER BY CASE
                             WHEN verification_status = 'VERIFIED' THEN 0
                             WHEN verification_status = 'AUTO_APPROVED' THEN 1
                             ELSE 2
                         END,
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

    public long countPlacesForModerationBackfill(PlaceModerationBackfillScope scope) {
        QueryParts queryParts = buildModerationBackfillQueryParts(scope);
        String sql = "SELECT COUNT(*) " + queryParts.fromAndWhereClause();

        Long count = namedParameterJdbcTemplate.queryForObject(sql, queryParts.parameters(), Long.class);
        return count == null ? 0 : count;
    }

    public void scanSourcePlacesForModerationBackfill(
            PlaceModerationBackfillScope scope,
            int scanLimit,
            Consumer<BackfillSourcePlaceRecord> consumer
    ) {
        StringBuilder sql = new StringBuilder("""
                SELECT p.id,
                       p.source,
                       p.source_external_id,
                       p.name,
                       p.province,
                       p.city,
                       p.district,
                       p.ward,
                       p.display_address,
                       ST_Y(p.location::geometry) AS latitude,
                       ST_X(p.location::geometry) AS longitude,
                       p.description,
                       p.duration_minutes,
                       p.indoor,
                       p.is_active,
                       p.price_level,
                       p.verification_status,
                       p.place_type,
                       p.quality_score,
                       p.is_recommendable,
                       p.reject_reason,
                       p.raw_tags::text AS raw_tags_json,
                       ARRAY(
                           SELECT pt.tag
                           FROM place_tags pt
                           WHERE pt.place_id = p.id
                           ORDER BY pt.tag
                       ) AS tags
                """);
        QueryParts queryParts = buildModerationBackfillQueryParts(scope);
        sql.append(queryParts.fromAndWhereClause())
                .append(" ORDER BY p.id");

        MapSqlParameterSource parameters = queryParts.parameters();
        if (scanLimit > 0) {
            sql.append(" LIMIT :scanLimit");
            parameters.addValue("scanLimit", scanLimit);
        }

        namedParameterJdbcTemplate.query(
                sql.toString(),
                parameters,
                (RowCallbackHandler) resultSet -> consumer.accept(mapBackfillSourcePlace(resultSet))
        );
    }

    private QueryParts buildModerationBackfillQueryParts(PlaceModerationBackfillScope scope) {
        LocationAliasFilter provinceFilter = resolveProvinceFilter(scope.province());
        LocationAliasFilter cityFilter = resolveCityFilter(scope.city());

        MapSqlParameterSource parameters = new MapSqlParameterSource()
                .addValue("sourceName", normalizeText(scope.sourceName()), Types.VARCHAR)
                .addValue("currentPlaceType", normalizePlaceType(scope.currentPlaceType()), Types.VARCHAR)
                .addValue(
                        "currentVerificationStatus",
                        normalizeVerificationStatus(scope.currentVerificationStatus()),
                        Types.VARCHAR
                )
                .addValue("currentRecommendable", scope.currentRecommendable(), Types.BOOLEAN);
        bindLocationFilter(parameters, "province", provinceFilter);
        bindLocationFilter(parameters, "city", cityFilter);

        StringBuilder where = new StringBuilder("""
                FROM places p
                WHERE p.source = :sourceName
                  AND (:currentPlaceType IS NULL OR p.place_type = :currentPlaceType)
                  AND (:currentVerificationStatus IS NULL OR p.verification_status = :currentVerificationStatus)
                  AND (:currentRecommendable IS NULL OR p.is_recommendable = :currentRecommendable)
                """);
        appendLocationFilter(where, "province", provinceFilter);
        appendLocationFilter(where, "city", cityFilter);

        return new QueryParts(where.toString(), parameters);
    }

    public int updatePlaceModerationBatch(String sourceName, List<ModerationUpdateCommand> updates) {
        if (updates == null || updates.isEmpty()) {
            return 0;
        }

        String sql = """
                UPDATE places
                SET place_type = :placeType,
                    quality_score = :qualityScore,
                    verification_status = :verificationStatus,
                    is_recommendable = :recommendable,
                    reject_reason = :rejectReason,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = :placeId
                  AND source = :sourceName
                """;

        List<Map<String, Object>> batchValues = updates.stream()
                .map(update -> {
                    Map<String, Object> values = new java.util.LinkedHashMap<>();
                    values.put("placeId", update.placeId());
                    values.put("placeType", update.placeType());
                    values.put("qualityScore", update.qualityScore());
                    values.put("verificationStatus", update.verificationStatus());
                    values.put("recommendable", update.recommendable());
                    values.put("rejectReason", update.rejectReason());
                    values.put("sourceName", sourceName);
                    return values;
                })
                .toList();

        SqlParameterSource[] batch = SqlParameterSourceUtils.createBatch(batchValues.toArray());
        int[] rows = namedParameterJdbcTemplate.batchUpdate(sql, batch);
        int updatedCount = 0;
        for (int rowCount : rows) {
            updatedCount += rowCount;
        }
        return updatedCount;
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
            String placeType,
            int qualityScore,
            boolean recommendable,
            String rejectReason,
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
                    place_type,
                    quality_score,
                    is_recommendable,
                    reject_reason,
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
                    :placeType,
                    :qualityScore,
                    :recommendable,
                    :rejectReason,
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
                .addValue("placeType", placeType)
                .addValue("qualityScore", qualityScore)
                .addValue("recommendable", recommendable)
                .addValue("rejectReason", rejectReason)
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
            String placeType,
            int qualityScore,
            boolean recommendable,
            String rejectReason,
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
                    place_type = :placeType,
                    quality_score = :qualityScore,
                    is_recommendable = :recommendable,
                    reject_reason = :rejectReason,
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
                .addValue("placeType", placeType)
                .addValue("qualityScore", qualityScore)
                .addValue("recommendable", recommendable)
                .addValue("rejectReason", rejectReason)
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
            String placeType,
            Integer qualityScore,
            Boolean recommendable,
            String rejectReason,
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
                    place_type = COALESCE(place_type, :placeType),
                    quality_score = GREATEST(COALESCE(quality_score, 0), COALESCE(:qualityScore, 0)),
                    is_recommendable = CASE
                        WHEN is_recommendable = TRUE THEN TRUE
                        ELSE COALESCE(:recommendable, FALSE)
                    END,
                    reject_reason = COALESCE(reject_reason, :rejectReason),
                    raw_tags = COALESCE(raw_tags, '{}'::jsonb) || CAST(:rawTagsJson AS jsonb),
                    verification_status = CASE
                        WHEN verification_status IN ('VERIFIED', 'AUTO_APPROVED') THEN verification_status
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
                .addValue("placeType", placeType)
                .addValue("qualityScore", qualityScore)
                .addValue("recommendable", recommendable)
                .addValue("rejectReason", rejectReason)
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

    public List<ProvinceNormalizationCandidate> findProvinceNullCandidates() {
        String sql = """
                SELECT p.id,
                       p.source,
                       p.source_external_id,
                       p.name,
                       p.province,
                       p.city,
                       p.place_type,
                       p.verification_status,
                       p.is_recommendable,
                       ST_Y(p.location::geometry) AS latitude,
                       ST_X(p.location::geometry) AS longitude
                FROM places p
                WHERE p.source = :sourceName
                  AND (p.province IS NULL OR LOWER(p.province) IN ('unknown'))
                  AND p.city IS NOT NULL
                  AND LOWER(p.city) != 'unknown'
                  AND p.city != ''
                ORDER BY p.id
                """;

        MapSqlParameterSource parameters = new MapSqlParameterSource()
                .addValue("sourceName", "OSM_GEOFABRIK");

        return namedParameterJdbcTemplate.query(sql, parameters, this::mapProvinceNormalizationCandidate);
    }

    public int updateProvinceBatch(String sourceName, List<ProvinceUpdateCommand> updates) {
        if (updates == null || updates.isEmpty()) {
            return 0;
        }

        String sql = """
                UPDATE places
                SET province = :province,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = :placeId
                  AND source = :sourceName
                """;

        List<Map<String, Object>> batchValues = updates.stream()
                .map(update -> {
                    Map<String, Object> values = new java.util.LinkedHashMap<>();
                    values.put("placeId", update.placeId());
                    values.put("province", update.province());
                    values.put("sourceName", sourceName);
                    return values;
                })
                .toList();

        SqlParameterSource[] batch = SqlParameterSourceUtils.createBatch(batchValues.toArray());
        int[] rows = namedParameterJdbcTemplate.batchUpdate(sql, batch);
        int updatedCount = 0;
        for (int rowCount : rows) {
            updatedCount += rowCount;
        }
        return updatedCount;
    }

    private ProvinceNormalizationCandidate mapProvinceNormalizationCandidate(ResultSet resultSet, int rowNum)
            throws SQLException {
        return new ProvinceNormalizationCandidate(
                resultSet.getLong("id"),
                resultSet.getString("source"),
                resultSet.getString("source_external_id"),
                resultSet.getString("name"),
                resultSet.getString("province"),
                resultSet.getString("city"),
                resultSet.getString("place_type"),
                resultSet.getString("verification_status"),
                resultSet.getObject("is_recommendable", Boolean.class),
                resultSet.getObject("latitude", Double.class),
                resultSet.getObject("longitude", Double.class)
        );
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

    private BackfillSourcePlaceRecord mapBackfillSourcePlace(ResultSet resultSet) throws SQLException {
        return new BackfillSourcePlaceRecord(
                resultSet.getLong("id"),
                resultSet.getString("source"),
                resultSet.getString("source_external_id"),
                resultSet.getString("name"),
                resultSet.getString("province"),
                resultSet.getString("city"),
                resultSet.getString("district"),
                resultSet.getString("ward"),
                resultSet.getString("display_address"),
                resultSet.getObject("latitude", Double.class),
                resultSet.getObject("longitude", Double.class),
                resultSet.getString("description"),
                resultSet.getObject("duration_minutes", Integer.class),
                resultSet.getObject("indoor", Boolean.class),
                resultSet.getObject("is_active", Boolean.class),
                resultSet.getString("price_level"),
                resultSet.getString("verification_status"),
                resultSet.getString("place_type"),
                resultSet.getObject("quality_score", Integer.class),
                resultSet.getObject("is_recommendable", Boolean.class),
                resultSet.getString("reject_reason"),
                resultSet.getString("raw_tags_json"),
                toTagSet(resultSet)
        );
    }

    private Set<String> toTagSet(ResultSet resultSet) throws SQLException {
        java.sql.Array sqlArray = resultSet.getArray("tags");
        if (sqlArray == null) {
            return Set.of();
        }

        Object arrayObject = sqlArray.getArray();
        if (!(arrayObject instanceof String[] tags) || tags.length == 0) {
            return Set.of();
        }

        LinkedHashSet<String> values = new LinkedHashSet<>();
        for (String tag : tags) {
            if (tag != null && !tag.isBlank()) {
                values.add(tag);
            }
        }
        return values;
    }

    public record ExistingPlaceRecord(
            long id,
            String source,
            String sourceExternalId,
            String verificationStatus,
            boolean verified
    ) {
    }

    public record BackfillSourcePlaceRecord(
            long id,
            String source,
            String sourceExternalId,
            String name,
            String province,
            String city,
            String district,
            String ward,
            String displayAddress,
            Double latitude,
            Double longitude,
            String description,
            Integer durationMinutes,
            Boolean indoor,
            Boolean active,
            String priceLevel,
            String verificationStatus,
            String currentPlaceType,
            Integer currentQualityScore,
            Boolean currentRecommendable,
            String currentRejectReason,
            String rawTagsJson,
            Set<String> tags
    ) {
    }

    public record ModerationUpdateCommand(
            long placeId,
            String placeType,
            int qualityScore,
            String verificationStatus,
            boolean recommendable,
            String rejectReason
    ) {
    }

    public record ProvinceNormalizationCandidate(
            long id,
            String source,
            String sourceExternalId,
            String name,
            String province,
            String city,
            String placeType,
            String verificationStatus,
            Boolean recommendable,
            Double latitude,
            Double longitude
    ) {
    }

    public record ProvinceUpdateCommand(
            long placeId,
            String province
    ) {
    }

    private String normalizeText(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private String normalizePlaceType(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String normalized = value.trim().toUpperCase(Locale.ROOT);
        return ALLOWED_PLACE_TYPES.contains(normalized) ? normalized : null;
    }

    private String normalizeVerificationStatus(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String normalized = value.trim().toUpperCase(Locale.ROOT);
        return ALLOWED_VERIFICATION_STATUSES.contains(normalized) ? normalized : null;
    }

    private LocationAliasFilter resolveProvinceFilter(String value) {
        String normalized = normalizeText(value);
        if (normalized == null) {
            return LocationAliasFilter.empty();
        }
        if (isHoChiMinhAlias(normalized)) {
            return new LocationAliasFilter(
                    normalized,
                    HO_CHI_MINH_PROVINCE_DB_ALIASES,
                    HO_CHI_MINH_CITY_DB_ALIASES
            );
        }
        return LocationAliasFilter.exact(normalized);
    }

    private LocationAliasFilter resolveCityFilter(String value) {
        String normalized = normalizeText(value);
        if (normalized == null) {
            return LocationAliasFilter.empty();
        }
        if (isHoChiMinhAlias(normalized)) {
            return new LocationAliasFilter(
                    normalized,
                    HO_CHI_MINH_CITY_DB_ALIASES,
                    HO_CHI_MINH_PROVINCE_DB_ALIASES
            );
        }
        return LocationAliasFilter.exact(normalized);
    }

    private boolean isHoChiMinhAlias(String value) {
        return HO_CHI_MINH_ALIAS_KEYS.contains(normalizeAliasKey(value));
    }

    private String normalizeAliasKey(String value) {
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .replace('đ', 'd')
                .replace('Đ', 'D')
                .toLowerCase(Locale.ROOT);
        return normalized.replaceAll("[^a-z0-9]+", " ").trim().replaceAll("\\s+", " ");
    }

    private void bindLocationFilter(
            MapSqlParameterSource parameters,
            String parameterName,
            LocationAliasFilter filter
    ) {
        parameters.addValue(parameterName, filter.exactValue(), Types.VARCHAR);
        parameters.addValue(parameterName + "Aliases", filter.aliases());
        parameters.addValue(parameterName + "RelatedAliases", filter.relatedAliases());
    }

    private void appendLocationFilter(
            StringBuilder sql,
            String parameterName,
            LocationAliasFilter filter
    ) {
        if (filter.isEmpty()) {
            sql.append(" AND (:").append(parameterName).append(" IS NULL)");
            return;
        }

        if (filter.hasAliases()) {
            String fieldName = parameterName.equals("province") ? "province" : "city";
            String relatedFieldName = parameterName.equals("province") ? "city" : "province";
            sql.append(" AND (")
                    .append("LOWER(COALESCE(p.")
                    .append(fieldName)
                    .append(", '')) IN (:")
                    .append(parameterName)
                    .append("Aliases)")
                    .append(" OR LOWER(COALESCE(p.")
                    .append(relatedFieldName)
                    .append(", '')) IN (:")
                    .append(parameterName)
                    .append("RelatedAliases))");
            return;
        }

        String fieldName = parameterName.equals("province") ? "province" : "city";
        sql.append(" AND LOWER(COALESCE(p.")
                .append(fieldName)
                .append(", '')) = LOWER(:")
                .append(parameterName)
                .append(")");
    }

    private record QueryParts(String fromAndWhereClause, MapSqlParameterSource parameters) {
    }

    private record LocationAliasFilter(
            String exactValue,
            List<String> aliases,
            List<String> relatedAliases
    ) {
        private static LocationAliasFilter empty() {
            return new LocationAliasFilter(null, List.of(), List.of());
        }

        private static LocationAliasFilter exact(String exactValue) {
            return new LocationAliasFilter(exactValue, List.of(), List.of());
        }

        private boolean isEmpty() {
            return exactValue == null;
        }

        private boolean hasAliases() {
            return !aliases.isEmpty();
        }
    }
}
