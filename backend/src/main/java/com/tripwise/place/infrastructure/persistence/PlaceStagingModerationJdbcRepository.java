package com.tripwise.place.infrastructure.persistence;

import com.tripwise.place.application.dto.StagingPlaceSearchQuery;
import com.tripwise.place.application.dto.StagingPlaceModerationResponse;
import com.tripwise.place.application.dto.StagingPlaceDetailResponse;
import com.tripwise.place.application.dto.DedupCandidateResponse;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.sql.Types;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;

@Repository
public class PlaceStagingModerationJdbcRepository {

    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of("id", "name", "created_at", "updated_at");

    private static final Set<String> NHA_TRANG_ALIAS_KEYS = Set.of(
            "nha trang", "tp nha trang", "tp. nha trang", "t.p. nha trang", "thanh pho nha trang"
    );
    private static final List<String> NHA_TRANG_CITY_DB_ALIASES = List.of(
            "nha trang", "tp. nha trang", "tp nha trang", "thành phố nha trang"
    );
    private static final Set<String> KHANH_HOA_ALIAS_KEYS = Set.of(
            "khanh hoa", "khanh hoa province", "khánh hòa", "tỉnh khánh hòa"
    );
    private static final List<String> KHANH_HOA_PROVINCE_DB_ALIASES = List.of(
            "khánh hòa", "khanh hoa"
    );

    private final ObjectProvider<NamedParameterJdbcTemplate> jdbcTemplateProvider;

    public PlaceStagingModerationJdbcRepository(ObjectProvider<NamedParameterJdbcTemplate> jdbcTemplateProvider) {
        this.jdbcTemplateProvider = jdbcTemplateProvider;
    }

    private NamedParameterJdbcTemplate jdbcTemplate() {
        NamedParameterJdbcTemplate template = jdbcTemplateProvider.getIfAvailable();
        if (template == null) {
            throw new IllegalStateException("NamedParameterJdbcTemplate is not available");
        }
        return template;
    }

    public Page<StagingPlaceModerationResponse> search(
            StagingPlaceSearchQuery query,
            Pageable pageable,
            String sortBy,
            String sortDirection
    ) {
        NamedParameterJdbcTemplate namedTemplate = jdbcTemplate();
        QueryParts queryParts = buildQueryParts(query);
        
        String countSql = "SELECT COUNT(*) " + queryParts.fromAndWhereClause();
        Long totalElements = namedTemplate.queryForObject(
                countSql,
                queryParts.parameters(),
                Long.class
        );

        if (totalElements == null || totalElements == 0) {
            return new PageImpl<>(List.of(), pageable, 0);
        }

        String actualSortBy = ALLOWED_SORT_FIELDS.contains(sortBy) ? sortBy : "id";
        String actualSortDir = "asc".equalsIgnoreCase(sortDirection) ? "ASC" : "DESC";

        String dataSql = """
                SELECT id, import_run_id, name, place_type_draft, latitude, longitude, region, locality, address, 
                       source, source_place_id, dedup_status, coordinate_status, validation_status, 
                       moderation_status, needs_admin_review, raw_payload,
                       COALESCE((mapping_payload->>'applied')::boolean, FALSE) as applied, created_at, updated_at
                """
                + queryParts.fromAndWhereClause()
                + " ORDER BY " + actualSortBy + " " + actualSortDir
                + " LIMIT :limit OFFSET :offset";

        MapSqlParameterSource params = queryParts.parameters()
                .addValue("limit", pageable.getPageSize())
                .addValue("offset", pageable.getOffset());

        List<StagingPlaceModerationResponse> content = namedTemplate.query(
                dataSql,
                params,
                this::mapStagingPlaceModerationResponse
        );

        return new PageImpl<>(content, pageable, totalElements);
    }

    public Optional<StagingPlaceDetailResponse> findById(Long id) {
        NamedParameterJdbcTemplate namedTemplate = jdbcTemplate();
        
        String stagingSql = """
                SELECT id, import_run_id, name, place_type_draft, latitude, longitude, region, locality, address, 
                       source, source_place_id, dedup_status, coordinate_status, validation_status, 
                       moderation_status, needs_admin_review, raw_payload,
                       COALESCE((mapping_payload->>'applied')::boolean, FALSE) as applied, created_at, updated_at
                FROM external_place_staging
                WHERE id = :id
                """;
        
        List<StagingPlaceModerationResponse> stagingList = namedTemplate.query(
                stagingSql,
                new MapSqlParameterSource("id", id),
                this::mapStagingPlaceModerationResponse
        );

        if (stagingList.isEmpty()) {
            return Optional.empty();
        }

        StagingPlaceModerationResponse staging = stagingList.getFirst();

        // 1. Fetch categories
        String categoriesSql = """
                SELECT source_category_id, category_label, category_path, is_primary
                FROM external_place_category_staging
                WHERE staging_place_id = :id
                """;
        List<StagingPlaceDetailResponse.CategoryResponse> categories = namedTemplate.query(
                categoriesSql,
                new MapSqlParameterSource("id", id),
                (rs, rowNum) -> StagingPlaceDetailResponse.CategoryResponse.builder()
                        .sourceCategoryId(rs.getString("source_category_id"))
                        .categoryLabel(rs.getString("category_label"))
                        .categoryPath(rs.getString("category_path"))
                        .isPrimary(rs.getBoolean("is_primary"))
                        .build()
        );

        // 2. Fetch candidates
        String candidatesSql = """
                SELECT c.id, c.existing_place_id, c.matched_staging_place_id, c.match_type, c.match_confidence, 
                       c.distance_meters, c.name_similarity, c.category_similarity, c.evidence, c.decision,
                       p.name as existing_place_name, p.place_type as existing_place_type, p.city as existing_place_city
                FROM external_place_dedup_candidates c
                LEFT JOIN places p ON p.id = c.existing_place_id
                WHERE c.staging_place_id = :id
                """;
        List<DedupCandidateResponse> candidates = namedTemplate.query(
                candidatesSql,
                new MapSqlParameterSource("id", id),
                (rs, rowNum) -> DedupCandidateResponse.builder()
                        .id(rs.getLong("id"))
                        .existingPlaceId((Long) rs.getObject("existing_place_id"))
                        .matchedStagingPlaceId((Long) rs.getObject("matched_staging_place_id"))
                        .matchType(rs.getString("match_type"))
                        .matchConfidence(rs.getString("match_confidence"))
                        .distanceMeters((Double) rs.getObject("distance_meters"))
                        .nameSimilarity((Double) rs.getObject("name_similarity"))
                        .categorySimilarity((Double) rs.getObject("category_similarity"))
                        .evidence(rs.getString("evidence"))
                        .decision(rs.getString("decision"))
                        .existingPlaceName(rs.getString("existing_place_name"))
                        .existingPlaceType(rs.getString("existing_place_type"))
                        .existingPlaceCity(rs.getString("existing_place_city"))
                        .build()
        );

        ExistingPublicRecord existingPublicDuplicate = null;
        if (!"HOTEL".equals(staging.getPlaceTypeDraft())) {
            existingPublicDuplicate = findPlaceBySourceAndExternalId(staging.getSource(), staging.getSourcePlaceId()).orElse(null);
        }

        return Optional.of(
                StagingPlaceDetailResponse.builder()
                        .stagingPlace(staging)
                        .categories(categories)
                        .candidates(candidates)
                        .existingPublicDuplicate(existingPublicDuplicate)
                        .build()
        );
    }

    public void updateModeration(Long id, String moderationStatus, String dedupStatus, boolean needsAdminReview) {
        jdbcTemplate().update(
                """
                UPDATE external_place_staging
                SET moderation_status = :moderationStatus,
                    dedup_status = :dedupStatus,
                    needs_admin_review = :needsAdminReview,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = :id
                """,
                new MapSqlParameterSource()
                        .addValue("id", id)
                        .addValue("moderationStatus", moderationStatus)
                        .addValue("dedupStatus", dedupStatus)
                        .addValue("needsAdminReview", needsAdminReview)
        );
    }

    public void updatePlaceTypeDraft(Long id, String placeTypeDraft) {
        jdbcTemplate().update(
                """
                UPDATE external_place_staging
                SET place_type_draft = :placeTypeDraft,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = :id
                """,
                new MapSqlParameterSource()
                        .addValue("id", id)
                        .addValue("placeTypeDraft", placeTypeDraft)
        );
    }

    public List<Long> findPendingStagingIds(String province, String city) {
        LocationAliasFilter provinceFilter = resolveProvinceFilter(province);
        LocationAliasFilter cityFilter = resolveCityFilter(city);
        
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("moderationStatus", "PENDING_ADMIN_REVIEW");
        bindLocationFilter(params, "province", provinceFilter);
        bindLocationFilter(params, "city", cityFilter);

        StringBuilder sql = new StringBuilder("""
                SELECT p.id
                FROM external_place_staging p
                WHERE p.moderation_status = :moderationStatus
                """);
        appendLocationFilter(sql, "province", provinceFilter);
        appendLocationFilter(sql, "city", cityFilter);
        sql.append(" ORDER BY p.id ASC");

        return jdbcTemplate().queryForList(sql.toString(), params, Long.class);
    }

    public List<Long> findAllStagingIdsByLocation(String province, String city) {
        LocationAliasFilter provinceFilter = resolveProvinceFilter(province);
        LocationAliasFilter cityFilter = resolveCityFilter(city);
        
        MapSqlParameterSource params = new MapSqlParameterSource();
        bindLocationFilter(params, "province", provinceFilter);
        bindLocationFilter(params, "city", cityFilter);

        StringBuilder sql = new StringBuilder("""
                SELECT p.id
                FROM external_place_staging p
                WHERE 1=1
                """);
        appendLocationFilter(sql, "province", provinceFilter);
        appendLocationFilter(sql, "city", cityFilter);
        sql.append(" ORDER BY p.id ASC");

        return jdbcTemplate().queryForList(sql.toString(), params, Long.class);
    }

    public void updateMappingPayload(Long id, String payloadJson) {
        jdbcTemplate().update(
                """
                UPDATE external_place_staging
                SET mapping_payload = :payload::jsonb,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = :id
                """,
                new MapSqlParameterSource()
                        .addValue("id", id)
                        .addValue("payload", payloadJson)
        );
    }

    public String getMappingPayload(Long id) {
        String sql = "SELECT mapping_payload FROM external_place_staging WHERE id = :id";
        return jdbcTemplate().queryForObject(
                sql,
                new MapSqlParameterSource("id", id),
                String.class
        );
    }

    public void updateCandidateDecision(Long candidateId, String decision) {
        jdbcTemplate().update(
                """
                UPDATE external_place_dedup_candidates
                SET decision = :decision,
                    decided_at = CURRENT_TIMESTAMP
                WHERE id = :id
                """,
                new MapSqlParameterSource()
                        .addValue("id", candidateId)
                        .addValue("decision", decision)
        );
    }

    private QueryParts buildQueryParts(StagingPlaceSearchQuery query) {
        LocationAliasFilter provinceFilter = resolveProvinceFilter(query.getProvince());
        LocationAliasFilter cityFilter = resolveCityFilter(query.getCity());
        String keywordPattern = query.getKeyword() == null || query.getKeyword().isBlank()
                ? null
                : "%" + query.getKeyword().trim().toLowerCase(Locale.ROOT) + "%";

        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("importRunId", query.getImportRunId(), Types.BIGINT)
                .addValue("moderationStatus", query.getModerationStatus(), Types.VARCHAR)
                .addValue("dedupStatus", query.getDedupStatus(), Types.VARCHAR)
                .addValue("placeTypeDraft", query.getPlaceTypeDraft(), Types.VARCHAR)
                .addValue("keywordPattern", keywordPattern, Types.VARCHAR);

        bindLocationFilter(params, "province", provinceFilter);
        bindLocationFilter(params, "city", cityFilter);

        StringBuilder sql = new StringBuilder("""
                FROM external_place_staging p
                WHERE (:importRunId IS NULL OR p.import_run_id = :importRunId)
                  AND (:moderationStatus IS NULL OR p.moderation_status = :moderationStatus)
                  AND (:dedupStatus IS NULL OR p.dedup_status = :dedupStatus)
                  AND (:placeTypeDraft IS NULL OR p.place_type_draft = :placeTypeDraft)
                """);

        appendLocationFilter(sql, "province", provinceFilter);
        appendLocationFilter(sql, "city", cityFilter);

        if (keywordPattern != null) {
            sql.append("""
                      AND (
                          LOWER(p.name) LIKE :keywordPattern
                          OR LOWER(COALESCE(p.locality, '')) LIKE :keywordPattern
                          OR LOWER(COALESCE(p.region, '')) LIKE :keywordPattern
                      )
                    """);
        }

        return new QueryParts(sql.toString(), params);
    }

    private StagingPlaceModerationResponse mapStagingPlaceModerationResponse(ResultSet rs, int rowNum) throws SQLException {
        Timestamp createdAt = rs.getTimestamp("created_at");
        Timestamp updatedAt = rs.getTimestamp("updated_at");

        return StagingPlaceModerationResponse.builder()
                .id(rs.getLong("id"))
                .importRunId(rs.getLong("import_run_id"))
                .name(rs.getString("name"))
                .placeTypeDraft(rs.getString("place_type_draft"))
                .latitude(rs.getDouble("latitude"))
                .longitude(rs.getDouble("longitude"))
                .region(rs.getString("region"))
                .locality(rs.getString("locality"))
                .address(rs.getString("address"))
                .source(rs.getString("source"))
                .sourcePlaceId(rs.getString("source_place_id"))
                .dedupStatus(rs.getString("dedup_status"))
                .coordinateStatus(rs.getString("coordinate_status"))
                .validationStatus(rs.getString("validation_status"))
                .moderationStatus(rs.getString("moderation_status"))
                .needsAdminReview(rs.getBoolean("needs_admin_review"))
                .applied(rs.getBoolean("applied"))
                .rawPayload(rs.getString("raw_payload"))
                .createdAt(createdAt == null ? null : createdAt.toInstant())
                .updatedAt(updatedAt == null ? null : updatedAt.toInstant())
                .build();
    }

    private String normalizeText(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private LocationAliasFilter resolveProvinceFilter(String value) {
        String normalized = normalizeText(value);
        if (normalized == null) {
            return LocationAliasFilter.empty();
        }
        if (isHoChiMinhAlias(normalized)) {
            return new LocationAliasFilter(
                    normalized,
                    List.of("hồ chí minh", "thành phố hồ chí minh"),
                    List.of("hồ chí minh", "ho chi minh", "ho chi minh city", "thành phố hồ chí minh", "thủ đức", "thành phố thủ đức")
            );
        }
        if (isKhanhHoaAlias(normalized)) {
            return new LocationAliasFilter(
                    normalized,
                    KHANH_HOA_PROVINCE_DB_ALIASES,
                    NHA_TRANG_CITY_DB_ALIASES
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
                    List.of("hồ chí minh", "ho chi minh", "ho chi minh city", "thành phố hồ chí minh", "thủ đức", "thành phố thủ đức"),
                    List.of("hồ chí minh", "thành phố hồ chí minh")
            );
        }
        if (isNhaTrangAlias(normalized)) {
            return new LocationAliasFilter(
                    normalized,
                    NHA_TRANG_CITY_DB_ALIASES,
                    KHANH_HOA_PROVINCE_DB_ALIASES
            );
        }
        return LocationAliasFilter.exact(normalized);
    }

    private boolean isHoChiMinhAlias(String value) {
        String key = normalizeAliasKey(value);
        return key.equals("ho chi minh") || key.equals("hcm") || key.equals("saigon");
    }

    private boolean isNhaTrangAlias(String value) {
        return NHA_TRANG_ALIAS_KEYS.contains(normalizeAliasKey(value));
    }

    private boolean isKhanhHoaAlias(String value) {
        return KHANH_HOA_ALIAS_KEYS.contains(normalizeAliasKey(value));
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
            String fieldName = parameterName.equals("province") ? "region" : "locality";
            String relatedFieldName = parameterName.equals("province") ? "locality" : "region";
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

        String fieldName = parameterName.equals("province") ? "region" : "locality";
        sql.append(" AND LOWER(COALESCE(p.")
                .append(fieldName)
                .append(", '')) = LOWER(:")
                .append(parameterName)
                .append(")");
    }

    public static String normalizeNameForDedup(String name) {
        if (name == null) return "";
        String normalized = Normalizer.normalize(name, Normalizer.Form.NFD);
        normalized = normalized.replaceAll("\\p{M}", "");
        normalized = normalized.toLowerCase(Locale.ROOT).replace('đ', 'd').replace('Đ', 'd');
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < normalized.length(); i++) {
            char c = normalized.charAt(i);
            if (Character.isLetterOrDigit(c) || Character.isWhitespace(c)) {
                sb.append(c);
            }
        }
        return sb.toString().trim().replaceAll("\\s+", " ");
    }

    public static double calculateNameSimilarity(String name1, String name2) {
        String[] w1 = name1.toLowerCase(Locale.ROOT).split("\\s+");
        String[] w2 = name2.toLowerCase(Locale.ROOT).split("\\s+");
        java.util.Set<String> s1 = new java.util.HashSet<>(java.util.Arrays.asList(w1));
        java.util.Set<String> s2 = new java.util.HashSet<>(java.util.Arrays.asList(w2));
        s1.remove("");
        s2.remove("");
        if (s1.isEmpty() || s2.isEmpty()) {
            return 0.0;
        }
        java.util.Set<String> intersection = new java.util.HashSet<>(s1);
        intersection.retainAll(s2);
        java.util.Set<String> union = new java.util.HashSet<>(s1);
        union.addAll(s2);
        return (double) intersection.size() / union.size();
    }

    public static double haversineDistance(double lat1, double lon1, double lat2, double lon2) {
        double R = 6371000.0;
        double phi1 = Math.toRadians(lat1);
        double phi2 = Math.toRadians(lat2);
        double deltaPhi = Math.toRadians(lat2 - lat1);
        double deltaLambda = Math.toRadians(lon2 - lon1);
        double a = Math.sin(deltaPhi / 2.0) * Math.sin(deltaPhi / 2.0)
                + Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2.0) * Math.sin(deltaLambda / 2.0);
        double c = 2.0 * Math.atan2(Math.sqrt(a), Math.sqrt(1.0 - a));
        return R * c;
    }

    public boolean existsPlaceBySourceAndExternalId(String source, String sourceExternalId) {
        String sql = "SELECT COUNT(*) FROM places WHERE source = :source AND source_external_id = :sourceExternalId";
        Long count = jdbcTemplate().queryForObject(
                sql,
                new MapSqlParameterSource()
                        .addValue("source", source)
                        .addValue("sourceExternalId", sourceExternalId),
                Long.class
        );
        return count != null && count > 0;
    }

    public record ExistingPublicRecord(
            String existingPublicType,
            Long existingPublicId,
            String existingName,
            String existingCity,
            String existingProvince,
            String existingSource,
            String existingSourcePlaceId
    ) {}

    public Optional<ExistingPublicRecord> findPlaceBySourceAndExternalId(String source, String sourceExternalId) {
        String sql = """
                SELECT id, name, city, province, source, source_external_id 
                FROM places 
                WHERE source = :source AND source_external_id = :sourceExternalId 
                LIMIT 1
                """;
        try {
            ExistingPublicRecord record = jdbcTemplate().queryForObject(
                    sql,
                    new MapSqlParameterSource()
                            .addValue("source", source)
                            .addValue("sourceExternalId", sourceExternalId),
                    (rs, rowNum) -> new ExistingPublicRecord(
                            "PLACE",
                            rs.getLong("id"),
                            rs.getString("name"),
                            rs.getString("city"),
                            rs.getString("province"),
                            rs.getString("source"),
                            rs.getString("source_external_id")
                    )
            );
            return Optional.ofNullable(record);
        } catch (org.springframework.dao.EmptyResultDataAccessException e) {
            return Optional.empty();
        }
    }

    public record PotentialDuplicatePlace(Long id, String name, String city, String province, double lat, double lng) {}
    public record PotentialDuplicateHotel(Long id, String name, String city, double lat, double lng) {}

    public List<PotentialDuplicatePlace> findPlacesWithinRadius(double longitude, double latitude, double radiusMeters) {
        String sql = """
                SELECT id, name, city, province, ST_Y(location::geometry) as lat, ST_X(location::geometry) as lng
                FROM places
                WHERE ST_DWithin(location, ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography, :radiusMeters)
                """;
        return jdbcTemplate().query(
                sql,
                new MapSqlParameterSource()
                        .addValue("longitude", longitude)
                        .addValue("latitude", latitude)
                        .addValue("radiusMeters", radiusMeters),
                (rs, rowNum) -> new PotentialDuplicatePlace(
                        rs.getLong("id"),
                        rs.getString("name"),
                        rs.getString("city"),
                        rs.getString("province"),
                        rs.getDouble("lat"),
                        rs.getDouble("lng")
                )
        );
    }

    public List<PotentialDuplicateHotel> findHotelsWithinRadius(double longitude, double latitude, double radiusMeters) {
        String sql = """
                SELECT id, name, city, ST_Y(location::geometry) as lat, ST_X(location::geometry) as lng
                FROM hotels
                WHERE ST_DWithin(location, ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography, :radiusMeters)
                """;
        return jdbcTemplate().query(
                sql,
                new MapSqlParameterSource()
                        .addValue("longitude", longitude)
                        .addValue("latitude", latitude)
                        .addValue("radiusMeters", radiusMeters),
                (rs, rowNum) -> new PotentialDuplicateHotel(
                        rs.getLong("id"),
                        rs.getString("name"),
                        rs.getString("city"),
                        rs.getDouble("lat"),
                        rs.getDouble("lng")
                )
        );
    }

    public Optional<Long> findCategoryIdBySlug(String slug) {
        String sql = "SELECT id FROM place_categories WHERE slug = :slug";
        try {
            Long id = jdbcTemplate().queryForObject(
                    sql,
                    new MapSqlParameterSource("slug", slug),
                    Long.class
            );
            return Optional.ofNullable(id);
        } catch (org.springframework.dao.EmptyResultDataAccessException e) {
            return Optional.empty();
        }
    }

    public Long insertPlace(String name, String city, String province, Long categoryId, double longitude, double latitude, String description, String address, String source, String sourcePlaceId, String placeType) {
        String sql = """
                INSERT INTO places (
                    name, city, category_id, location, description, estimated_cost,
                    duration_minutes, indoor, is_active, is_verified, price_level,
                    rating, province, display_address, source, source_external_id,
                    raw_tags, verification_status, last_synced_at, place_type, is_recommendable, quality_score
                ) VALUES (
                    :name, :city, :categoryId, ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography, :description, 0.0,
                    60, FALSE, TRUE, TRUE, 'MEDIUM',
                    NULL, :province, :displayAddress, :source, :sourcePlaceId,
                    '{}'::jsonb, 'VERIFIED', CURRENT_TIMESTAMP, :placeType, TRUE, 85
                ) RETURNING id
                """;
        return jdbcTemplate().queryForObject(
                sql,
                new MapSqlParameterSource()
                        .addValue("name", name)
                        .addValue("city", city)
                        .addValue("province", province)
                        .addValue("categoryId", categoryId)
                        .addValue("longitude", longitude)
                        .addValue("latitude", latitude)
                        .addValue("description", description)
                        .addValue("displayAddress", address)
                        .addValue("source", source)
                        .addValue("sourcePlaceId", sourcePlaceId)
                        .addValue("placeType", placeType),
                Long.class
        );
    }

    public void insertPlaceDataSource(Long placeId, String source, String sourcePlaceId, String notes) {
        String sql = """
                INSERT INTO place_data_sources (
                    place_id, field_group, source_name, source_reference, verification_status, confidence_level, notes
                ) VALUES (
                    :placeId, 'CORE', :source, :sourcePlaceId, 'VERIFIED', 'HIGH', :notes
                )
                """;
        jdbcTemplate().update(
                sql,
                new MapSqlParameterSource()
                        .addValue("placeId", placeId)
                        .addValue("source", source)
                        .addValue("sourcePlaceId", sourcePlaceId)
                        .addValue("notes", notes)
        );
    }

    public Long insertHotel(String name, String city, double longitude, double latitude, String description) {
        String sql = """
                INSERT INTO hotels (
                    name, city, location, price_level, description, is_active, star_rating
                ) VALUES (
                    :name, :city, ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography, 'MEDIUM', :description, TRUE, 3
                ) RETURNING id
                """;
        return jdbcTemplate().queryForObject(
                sql,
                new MapSqlParameterSource()
                        .addValue("name", name)
                        .addValue("city", city)
                        .addValue("longitude", longitude)
                        .addValue("latitude", latitude)
                        .addValue("description", description),
                Long.class
        );
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
