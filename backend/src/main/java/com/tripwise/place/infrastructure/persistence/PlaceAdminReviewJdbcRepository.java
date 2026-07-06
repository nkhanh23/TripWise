package com.tripwise.place.infrastructure.persistence;

import com.tripwise.common.exception.BusinessException;
import com.tripwise.place.application.dto.AdminPlaceReviewQuery;
import com.tripwise.place.application.dto.AdminPlaceReviewResponse;
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
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Repository
public class PlaceAdminReviewJdbcRepository {

    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
            "updatedAt",
            "qualityScore",
            "name",
            "verificationStatus",
            "source"
    );
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

    private final ObjectProvider<NamedParameterJdbcTemplate> jdbcTemplateProvider;

    public PlaceAdminReviewJdbcRepository(ObjectProvider<NamedParameterJdbcTemplate> jdbcTemplateProvider) {
        this.jdbcTemplateProvider = jdbcTemplateProvider;
    }

    public Page<AdminPlaceReviewResponse> search(
            AdminPlaceReviewQuery query,
            Pageable pageable,
            String sortBy,
            String sortDirection
    ) {
        NamedParameterJdbcTemplate namedParameterJdbcTemplate = jdbcTemplate();
        QueryParts queryParts = buildQueryParts(query);
        String countSql = "SELECT COUNT(*) " + queryParts.fromAndWhereClause();

        Long totalElements = namedParameterJdbcTemplate.queryForObject(
                countSql,
                queryParts.parameters(),
                Long.class
        );

        if (totalElements == null || totalElements == 0) {
            return new PageImpl<>(List.of(), pageable, 0);
        }

        String dataSql = """
                SELECT p.id,
                       p.name,
                       p.source,
                       p.source_external_id,
                       p.province,
                       p.city,
                       p.district,
                       p.ward,
                       p.place_type,
                       p.verification_status,
                       p.is_recommendable,
                       p.quality_score,
                       p.reject_reason,
                       p.duration_minutes,
                       p.raw_tags,
                       p.updated_at,
                       ST_Y(p.location::geometry) AS latitude,
                       ST_X(p.location::geometry) AS longitude
                """
                + queryParts.fromAndWhereClause()
                + " ORDER BY " + toOrderBy(sortBy, sortDirection)
                + " LIMIT :limit OFFSET :offset";

        MapSqlParameterSource parameters = queryParts.parameters()
                .addValue("limit", pageable.getPageSize())
                .addValue("offset", pageable.getOffset());

        List<AdminPlaceReviewResponse> content = namedParameterJdbcTemplate.query(
                dataSql,
                parameters,
                this::mapAdminPlaceReviewResponse
        );
        attachTags(content);
        return new PageImpl<>(content, pageable, totalElements);
    }

    private QueryParts buildQueryParts(AdminPlaceReviewQuery query) {
        LocationAliasFilter provinceFilter = resolveProvinceFilter(query.getProvince());
        LocationAliasFilter cityFilter = resolveCityFilter(query.getCity());
        String keywordPattern = normalizeText(query.getKeyword()) == null
                ? null
                : "%" + normalizeText(query.getKeyword()).toLowerCase(Locale.ROOT) + "%";

        MapSqlParameterSource parameters = new MapSqlParameterSource()
                .addValue("source", normalizeText(query.getSource()), Types.VARCHAR)
                .addValue("placeType", normalizePlaceType(query.getPlaceType()), Types.VARCHAR)
                .addValue("verificationStatus", normalizeVerificationStatus(query.getVerificationStatus()), Types.VARCHAR)
                .addValue("recommendable", query.getRecommendable(), Types.BOOLEAN)
                .addValue("keywordPattern", keywordPattern, Types.VARCHAR);
        bindLocationFilter(parameters, "province", provinceFilter);
        bindLocationFilter(parameters, "city", cityFilter);

        StringBuilder where = new StringBuilder("""
                FROM places p
                WHERE p.is_active = TRUE
                  AND (:source IS NULL OR p.source = :source)
                  AND (:placeType IS NULL OR p.place_type = :placeType)
                  AND (:verificationStatus IS NULL OR p.verification_status = :verificationStatus)
                  AND (:recommendable IS NULL OR p.is_recommendable = :recommendable)
                """);
        appendLocationFilter(where, "province", provinceFilter);
        appendLocationFilter(where, "city", cityFilter);
        where.append("""
                  AND (:keywordPattern IS NULL OR (
                      LOWER(p.name) LIKE :keywordPattern
                      OR LOWER(COALESCE(p.source_external_id, '')) LIKE :keywordPattern
                      OR LOWER(COALESCE(p.display_address, '')) LIKE :keywordPattern
                      OR LOWER(COALESCE(p.city, '')) LIKE :keywordPattern
                      OR LOWER(COALESCE(p.province, '')) LIKE :keywordPattern
                  ))
                """);

        return new QueryParts(where.toString(), parameters);
    }

    private void attachTags(List<AdminPlaceReviewResponse> responses) {
        if (responses.isEmpty()) {
            return;
        }

        Map<Long, Set<String>> tagsByPlaceId = fetchTagsByPlaceIds(
                responses.stream().map(AdminPlaceReviewResponse::getId).toList()
        );
        responses.forEach(response -> response.setTags(tagsByPlaceId.getOrDefault(response.getId(), Set.of())));
    }

    private Map<Long, Set<String>> fetchTagsByPlaceIds(List<Long> placeIds) {
        if (placeIds.isEmpty()) {
            return Map.of();
        }

        String sql = """
                SELECT place_id, tag
                FROM place_tags
                WHERE place_id IN (:placeIds)
                ORDER BY place_id, tag
                """;

        return jdbcTemplate().query(sql, new MapSqlParameterSource("placeIds", placeIds), resultSet -> {
            Map<Long, Set<String>> tagsByPlaceId = new LinkedHashMap<>();
            while (resultSet.next()) {
                tagsByPlaceId.computeIfAbsent(resultSet.getLong("place_id"), ignored -> new LinkedHashSet<>())
                        .add(resultSet.getString("tag"));
            }
            return tagsByPlaceId;
        });
    }

    private NamedParameterJdbcTemplate jdbcTemplate() {
        NamedParameterJdbcTemplate jdbcTemplate = jdbcTemplateProvider.getIfAvailable();
        if (jdbcTemplate == null) {
            throw new BusinessException(
                    "Place admin review read model is unavailable because the datasource is not configured",
                    "PLACE_ADMIN_REVIEW_READ_MODEL_UNAVAILABLE"
            );
        }
        return jdbcTemplate;
    }

    private String toOrderBy(String sortBy, String sortDirection) {
        String normalizedSortField = ALLOWED_SORT_FIELDS.contains(sortBy) ? sortBy : "updatedAt";
        boolean descending = !"asc".equalsIgnoreCase(sortDirection);

        return switch (normalizedSortField) {
            case "qualityScore" -> "COALESCE(p.quality_score, 0) " + direction(descending) + ", p.id DESC";
            case "name" -> "LOWER(p.name) " + direction(descending) + ", p.id ASC";
            case "verificationStatus" -> "LOWER(COALESCE(p.verification_status, '')) " + direction(descending) + ", p.id DESC";
            case "source" -> "LOWER(COALESCE(p.source, '')) " + direction(descending) + ", p.id DESC";
            default -> "COALESCE(p.updated_at, p.created_at) " + direction(descending) + ", p.id DESC";
        };
    }

    private String direction(boolean descending) {
        return descending ? "DESC" : "ASC";
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

    private AdminPlaceReviewResponse mapAdminPlaceReviewResponse(ResultSet resultSet, int rowNum) throws SQLException {
        Timestamp updatedAt = resultSet.getTimestamp("updated_at");

        return AdminPlaceReviewResponse.builder()
                .id(resultSet.getLong("id"))
                .name(resultSet.getString("name"))
                .source(resultSet.getString("source"))
                .sourceExternalId(resultSet.getString("source_external_id"))
                .province(resultSet.getString("province"))
                .city(resultSet.getString("city"))
                .district(resultSet.getString("district"))
                .ward(resultSet.getString("ward"))
                .placeType(resultSet.getString("place_type"))
                .verificationStatus(resultSet.getString("verification_status"))
                .recommendable(resultSet.getBoolean("is_recommendable"))
                .qualityScore(resultSet.getInt("quality_score"))
                .rejectReason(resultSet.getString("reject_reason"))
                .durationMinutes(resultSet.getInt("duration_minutes"))
                .latitude(resultSet.getDouble("latitude"))
                .longitude(resultSet.getDouble("longitude"))
                .rawTags(resultSet.getString("raw_tags"))
                .updatedAt(updatedAt == null ? null : updatedAt.toInstant())
                .build();
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
