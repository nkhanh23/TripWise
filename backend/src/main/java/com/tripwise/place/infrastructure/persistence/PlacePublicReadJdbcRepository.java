package com.tripwise.place.infrastructure.persistence;

import com.tripwise.common.exception.BusinessException;
import com.tripwise.place.application.dto.MapPlacesQuery;
import com.tripwise.place.application.dto.PlaceDetailResponse;
import com.tripwise.place.application.dto.PlaceMapMarkerResponse;
import com.tripwise.place.application.dto.PlaceResponse;
import com.tripwise.place.application.dto.SearchPlacesQuery;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Repository
public class PlacePublicReadJdbcRepository {

    private static final int DEFAULT_PUBLIC_MIN_QUALITY_SCORE = 80;
    private static final int FOOD_PUBLIC_MIN_QUALITY_SCORE = 75;
    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of("name", "rating", "popularityScore");
    private static final Set<String> ALLOWED_PLACE_TYPES = Set.of(
            "ATTRACTION",
            "FOOD",
            "HOTEL",
            "SERVICE",
            "ALL"
    );
    private static final Set<String> ALLOWED_VERIFICATION_STATUSES = Set.of(
            "AUTO_APPROVED",
            "VERIFIED"
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
    private static final List<String> HO_CHI_MINH_CITY_DB_ALIASES_CANONICAL = List.of(
            "h\u1ed3 ch\u00ed minh",
            "ho chi minh",
            "ho chi minh city",
            "th\u00e0nh ph\u1ed1 h\u1ed3 ch\u00ed minh",
            "th\u1ee7 \u0111\u1ee9c",
            "th\u00e0nh ph\u1ed1 th\u1ee7 \u0111\u1ee9c"
    );
    private static final List<String> HO_CHI_MINH_PROVINCE_DB_ALIASES_CANONICAL = List.of(
            "h\u1ed3 ch\u00ed minh",
            "th\u00e0nh ph\u1ed1 h\u1ed3 ch\u00ed minh"
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

    private static final Set<String> NHA_TRANG_ALIAS_KEYS = Set.of(
            "nha trang",
            "tp nha trang",
            "tp. nha trang",
            "t.p. nha trang",
            "thanh pho nha trang",
            "tp nha trang kh",
            "tp. nha trang, kh",
            "tp. nha trang kh",
            "tp nha trang, kh",
            "nha trang city",
            "thanh pho nha trang khanh hoa",
            "khanh hoa nha trang",
            "nha trang khanh hoa",
            "nha trang vietnam",
            "nha trang viet nam"
    );
    private static final List<String> NHA_TRANG_CITY_DB_ALIASES_CANONICAL = List.of(
            "nha trang",
            "tp. nha trang",
            "tp nha trang",
            "t.p. nha trang",
            "thành phố nha trang",
            "nha trang, tỉnh khánh hòa",
            "nha trang, tinh khanh hoa",
            "bắc nha trang",
            "bac nha trang",
            "nha trang city",
            "nha trang, khanh hoa",
            "nha trang, khánh hòa",
            "nha trang, khánh hoá",
            "khánh hoá, nha trang",
            "nha trang-khánh hòa",
            "nha trang - khanh hoa",
            "thanh pho nha trang",
            "nha trang / vietnam",
            "nha trang, vietnam",
            "nha trang viet nam",
            "nha trang,",
            "nam nha trang",
            "p. nam nha trang",
            "tay nha trang",
            "p. nha trang",
            "nha trang (нячанг)",
            "t.p. nha trang city",
            "khánh hòa",
            "khanh hoa"
    );
    private static final Set<String> KHANH_HOA_ALIAS_KEYS = Set.of(
            "khanh hoa",
            "khanh hoa province",
            "khánh hòa",
            "tỉnh khánh hòa",
            "tinh khanh hoa",
            "tinh khanh hoa province",
            "khánh hòa province"
    );
    private static final List<String> KHANH_HOA_PROVINCE_DB_ALIASES_CANONICAL = List.of(
            "khánh hòa",
            "khanh hoa",
            "khánh hòa province",
            "tỉnh khánh hòa",
            "tinh khanh hoa"
    );

    private final ObjectProvider<NamedParameterJdbcTemplate> jdbcTemplateProvider;

    public PlacePublicReadJdbcRepository(ObjectProvider<NamedParameterJdbcTemplate> jdbcTemplateProvider) {
        this.jdbcTemplateProvider = jdbcTemplateProvider;
    }

    public Page<PlaceResponse> search(SearchPlacesQuery query, Pageable pageable, String sortBy, String sortDirection) {
        NamedParameterJdbcTemplate namedParameterJdbcTemplate = jdbcTemplate();
        QueryParts queryParts = buildSearchQueryParts(query);
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
                       p.province,
                       p.city,
                       p.district,
                       p.ward,
                       p.display_address,
                       pc.id AS category_id,
                       pc.name AS category_name,
                       pc.slug AS category_slug,
                       p.description,
                       p.estimated_cost,
                       p.duration_minutes,
                       p.indoor,
                       p.is_verified,
                       p.price_level,
                       p.rating,
                       p.verification_status,
                       p.source,
                       ST_Y(p.location::geometry) AS latitude,
                       ST_X(p.location::geometry) AS longitude,
                       ppm.popularity_score,
                       img.image_url AS primary_image_url
                """
                + queryParts.fromAndWhereClause()
                + " ORDER BY " + toOrderBy(sortBy, sortDirection)
                + " LIMIT :limit OFFSET :offset";

        MapSqlParameterSource parameters = queryParts.parameters()
                .addValue("limit", pageable.getPageSize())
                .addValue("offset", pageable.getOffset());

        List<PlaceResponse> content = namedParameterJdbcTemplate.query(dataSql, parameters, this::mapPlaceResponse);
        attachTags(content);
        return new PageImpl<>(content, pageable, totalElements);
    }

    public List<PlaceMapMarkerResponse> findMapMarkers(MapPlacesQuery query) {
        NamedParameterJdbcTemplate namedParameterJdbcTemplate = jdbcTemplate();
        LocationAliasFilter provinceFilter = resolveProvinceFilter(query.getProvince());
        LocationAliasFilter cityFilter = resolveCityFilter(query.getCity());
        String normalizedPlaceType = normalizePlaceType(query.getPlaceType());
        int minQualityScore = resolveMinQualityScore(normalizedPlaceType);
        MapSqlParameterSource parameters = new MapSqlParameterSource()
                .addValue("minLatitude", query.getMinLatitude())
                .addValue("minLongitude", query.getMinLongitude())
                .addValue("maxLatitude", query.getMaxLatitude())
                .addValue("maxLongitude", query.getMaxLongitude())
                .addValue("placeType", normalizedPlaceType, Types.VARCHAR)
                .addValue("categoryId", query.getCategoryId(), Types.BIGINT)
                .addValue("verificationStatus", normalizeVerificationStatus(query.getVerificationStatus()), Types.VARCHAR)
                .addValue("minRating", query.getMinRating(), Types.NUMERIC)
                .addValue("minQualityScore", minQualityScore)
                .addValue("limit", query.getLimit());
        bindLocationFilter(parameters, "province", provinceFilter);
        bindLocationFilter(parameters, "city", cityFilter);

        List<String> normalizedTags = normalizeTags(query.getTags());

        StringBuilder sql = new StringBuilder()
                .append("""
                SELECT p.id,
                       p.name,
                       p.province,
                       p.city,
                       pc.name AS category_name,
                       pc.slug AS category_slug,
                       p.rating,
                       img.image_url AS primary_image_url,
                       p.verification_status,
                       ppm.popularity_score,
                       ST_Y(p.location::geometry) AS latitude,
                       ST_X(p.location::geometry) AS longitude
                FROM places p
                JOIN place_categories pc ON pc.id = p.category_id
                LEFT JOIN place_popularity_metrics ppm ON ppm.place_id = p.id
                LEFT JOIN LATERAL (
                    SELECT pi.image_url
                    FROM place_images pi
                    WHERE pi.place_id = p.id
                    ORDER BY pi.is_primary DESC, pi.display_order ASC, pi.id ASC
                    LIMIT 1
                ) img ON TRUE
                WHERE p.is_active = TRUE
                  AND p.is_recommendable = TRUE
                """);

        if ("ALL".equals(normalizedPlaceType)) {
            sql.append("\n  AND p.place_type IN ('ATTRACTION', 'FOOD', 'HOTEL', 'SERVICE')");
        } else {
            sql.append("""
                      AND (
                          p.place_type = COALESCE(:placeType, 'ATTRACTION')
                          OR (
                              p.place_type IS NULL
                              AND COALESCE(:placeType, 'ATTRACTION') = 'ATTRACTION'
                          )
                      )
                    """);
        }

        sql.append("""
                  AND p.verification_status IN ('AUTO_APPROVED', 'VERIFIED')
                """);

        if ("ALL".equals(normalizedPlaceType)) {
            sql.append("""
                      AND (
                          (p.place_type = 'FOOD' AND COALESCE(p.quality_score, 0) >= 75)
                          OR (p.place_type IN ('ATTRACTION', 'HOTEL', 'SERVICE') AND COALESCE(p.quality_score, 0) >= 80)
                          OR (p.source = 'MANUAL_SEED' AND p.is_recommendable = TRUE)
                      )
                    """);
        } else {
            sql.append("""
                      AND (
                          COALESCE(p.quality_score, 0) >= :minQualityScore
                          OR (p.source = 'MANUAL_SEED' AND p.is_recommendable = TRUE)
                      )
                    """);
        }

        sql.append("""
                  AND p.location::geometry && ST_MakeEnvelope(:minLongitude, :minLatitude, :maxLongitude, :maxLatitude, 4326)
                  AND (:categoryId IS NULL OR p.category_id = :categoryId)
                  AND (:verificationStatus IS NULL OR p.verification_status = :verificationStatus)
                  AND (:minRating IS NULL OR p.rating >= :minRating)
                """);
        appendLocationFilter(sql, "province", provinceFilter);
        appendLocationFilter(sql, "city", cityFilter);

        if (!normalizedTags.isEmpty()) {
            parameters.addValue("tags", normalizedTags);
            sql.append("""
                  AND EXISTS (
                      SELECT 1
                      FROM place_tags pt
                      WHERE pt.place_id = p.id
                        AND LOWER(pt.tag) IN (:tags)
                  )
                  """);
        }

        sql.append("""
                ORDER BY COALESCE(ppm.popularity_score, 0) DESC, COALESCE(p.rating, 0) DESC, LOWER(p.name) ASC
                LIMIT :limit
                """);

        return namedParameterJdbcTemplate.query(sql.toString(), parameters, this::mapPlaceMarkerResponse);
    }

    public Optional<PlaceDetailResponse> findPublicPlaceDetailById(Long placeId) {
        NamedParameterJdbcTemplate namedParameterJdbcTemplate = jdbcTemplate();
        String sql = """
                SELECT p.id,
                       p.name,
                       p.province,
                       p.city,
                       p.district,
                       p.ward,
                       p.display_address,
                       pc.id AS category_id,
                       pc.name AS category_name,
                       pc.slug AS category_slug,
                       p.description,
                       p.estimated_cost,
                       p.duration_minutes,
                       p.indoor,
                       p.is_verified,
                       p.price_level,
                       p.rating,
                       p.verification_status,
                       ST_Y(p.location::geometry) AS latitude,
                       ST_X(p.location::geometry) AS longitude,
                       ppm.popularity_score,
                       img.image_url AS primary_image_url
                FROM places p
                JOIN place_categories pc ON pc.id = p.category_id
                LEFT JOIN place_popularity_metrics ppm ON ppm.place_id = p.id
                LEFT JOIN LATERAL (
                    SELECT pi.image_url
                    FROM place_images pi
                    WHERE pi.place_id = p.id
                    ORDER BY pi.is_primary DESC, pi.display_order ASC, pi.id ASC
                    LIMIT 1
                ) img ON TRUE
                WHERE p.id = :placeId
                  AND p.is_active = TRUE
                  AND p.is_recommendable = TRUE
                  AND p.verification_status <> 'REJECTED'
                LIMIT 1
                """;

        List<PlaceDetailResponse> rows = namedParameterJdbcTemplate.query(
                sql,
                new MapSqlParameterSource("placeId", placeId),
                this::mapPlaceDetailResponse
        );

        if (rows.isEmpty()) {
            return Optional.empty();
        }

        PlaceDetailResponse detailResponse = rows.get(0);
        detailResponse.setTags(fetchTagsByPlaceIds(List.of(placeId)).getOrDefault(placeId, Set.of()));
        return Optional.of(detailResponse);
    }

    private QueryParts buildSearchQueryParts(SearchPlacesQuery query) {
        LocationAliasFilter provinceFilter = resolveProvinceFilter(query.getProvince());
        LocationAliasFilter cityFilter = resolveCityFilter(query.getCity());
        String normalizedPlaceType = normalizePlaceType(query.getPlaceType());
        int minQualityScore = resolveMinQualityScore(normalizedPlaceType);
        MapSqlParameterSource parameters = new MapSqlParameterSource()
                .addValue("placeType", normalizedPlaceType, Types.VARCHAR)
                .addValue("categoryId", query.getCategoryId(), Types.BIGINT)
                .addValue("priceLevel", normalizeText(query.getPriceLevel()), Types.VARCHAR)
                .addValue("verificationStatus", normalizeVerificationStatus(query.getVerificationStatus()), Types.VARCHAR)
                .addValue("minRating", query.getMinRating(), Types.NUMERIC)
                .addValue("minQualityScore", minQualityScore);
        bindLocationFilter(parameters, "province", provinceFilter);
        bindLocationFilter(parameters, "city", cityFilter);

        List<String> normalizedTags = normalizeTags(query.getTags());
        if (!normalizedTags.isEmpty()) {
            parameters.addValue("tags", normalizedTags);
        }

        String keywordPattern = normalizeText(query.getKeyword()) == null
                ? null
                : "%" + normalizeText(query.getKeyword()).toLowerCase(Locale.ROOT) + "%";
        parameters.addValue("keywordPattern", keywordPattern, Types.VARCHAR);

        StringBuilder where = new StringBuilder()
                .append("""
                FROM places p
                JOIN place_categories pc ON pc.id = p.category_id
                LEFT JOIN place_popularity_metrics ppm ON ppm.place_id = p.id
                LEFT JOIN LATERAL (
                    SELECT pi.image_url
                    FROM place_images pi
                    WHERE pi.place_id = p.id
                    ORDER BY pi.is_primary DESC, pi.display_order ASC, pi.id ASC
                    LIMIT 1
                ) img ON TRUE
                WHERE p.is_active = TRUE
                  AND p.is_recommendable = TRUE
                """);

        if ("ALL".equals(normalizedPlaceType)) {
            where.append("\n  AND p.place_type IN ('ATTRACTION', 'FOOD', 'HOTEL', 'SERVICE')");
        } else {
            where.append("""
                      AND (
                          p.place_type = COALESCE(:placeType, 'ATTRACTION')
                          OR (
                              p.place_type IS NULL
                              AND COALESCE(:placeType, 'ATTRACTION') = 'ATTRACTION'
                          )
                      )
                    """);
        }

        where.append("""
                  AND p.verification_status IN ('AUTO_APPROVED', 'VERIFIED')
                """);

        if ("ALL".equals(normalizedPlaceType)) {
            where.append("""
                      AND (
                          (p.place_type = 'FOOD' AND COALESCE(p.quality_score, 0) >= 75)
                          OR (p.place_type IN ('ATTRACTION', 'HOTEL', 'SERVICE') AND COALESCE(p.quality_score, 0) >= 80)
                          OR (p.source = 'MANUAL_SEED' AND p.is_recommendable = TRUE)
                      )
                    """);
        } else {
            where.append("""
                      AND (
                          COALESCE(p.quality_score, 0) >= :minQualityScore
                          OR (p.source = 'MANUAL_SEED' AND p.is_recommendable = TRUE)
                      )
                    """);
        }

        where.append("""
                  AND (:categoryId IS NULL OR p.category_id = :categoryId)
                  AND (:priceLevel IS NULL OR LOWER(COALESCE(p.price_level, '')) = LOWER(:priceLevel))
                  AND (:verificationStatus IS NULL OR p.verification_status = :verificationStatus)
                  AND (:minRating IS NULL OR p.rating >= :minRating)
                """);
        appendLocationFilter(where, "province", provinceFilter);
        appendLocationFilter(where, "city", cityFilter);

        if (!normalizedTags.isEmpty()) {
            where.append("""
                  AND EXISTS (
                      SELECT 1
                      FROM place_tags pt
                      WHERE pt.place_id = p.id
                        AND LOWER(pt.tag) IN (:tags)
                  )
                  """);
        }

        where.append("""
                  AND (:keywordPattern IS NULL OR (
                      LOWER(p.name) LIKE :keywordPattern
                      OR LOWER(COALESCE(p.description, '')) LIKE :keywordPattern
                      OR LOWER(COALESCE(p.display_address, '')) LIKE :keywordPattern
                  ))
                """);

        return new QueryParts(where.toString(), parameters);
    }

    private void attachTags(List<PlaceResponse> responses) {
        if (responses.isEmpty()) {
            return;
        }

        Map<Long, Set<String>> tagsByPlaceId = fetchTagsByPlaceIds(
                responses.stream().map(PlaceResponse::getId).toList()
        );
        responses.forEach(response -> response.setTags(tagsByPlaceId.getOrDefault(response.getId(), Set.of())));
    }

    private Map<Long, Set<String>> fetchTagsByPlaceIds(List<Long> placeIds) {
        if (placeIds.isEmpty()) {
            return Map.of();
        }

        NamedParameterJdbcTemplate namedParameterJdbcTemplate = jdbcTemplate();

        String sql = """
                SELECT place_id, tag
                FROM place_tags
                WHERE place_id IN (:placeIds)
                ORDER BY place_id, tag
                """;

        return namedParameterJdbcTemplate.query(sql, new MapSqlParameterSource("placeIds", placeIds), resultSet -> {
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
                    "Place read model is unavailable because the datasource is not configured",
                    "PLACE_READ_MODEL_UNAVAILABLE"
            );
        }
        return jdbcTemplate;
    }

    private String toOrderBy(String sortBy, String sortDirection) {
        String normalizedSortField = ALLOWED_SORT_FIELDS.contains(sortBy) ? sortBy : "name";
        boolean descending = "desc".equalsIgnoreCase(sortDirection);

        return switch (normalizedSortField) {
            case "rating" -> "COALESCE(p.rating, 0) " + direction(descending) + ", LOWER(p.name) ASC";
            case "popularityScore" ->
                    "COALESCE(ppm.popularity_score, 0) " + direction(descending) + ", LOWER(p.name) ASC";
            default -> "LOWER(p.name) " + direction(descending) + ", p.id ASC";
        };
    }

    private String direction(boolean descending) {
        return descending ? "DESC" : "ASC";
    }

    private List<String> normalizeTags(List<String> tags) {
        if (tags == null || tags.isEmpty()) {
            return List.of();
        }

        return tags.stream()
                .filter(tag -> tag != null && !tag.isBlank())
                .map(tag -> tag.trim().toLowerCase(Locale.ROOT))
                .distinct()
                .collect(Collectors.toCollection(ArrayList::new));
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
                    HO_CHI_MINH_PROVINCE_DB_ALIASES_CANONICAL,
                    HO_CHI_MINH_CITY_DB_ALIASES_CANONICAL
            );
        }
        if (isKhanhHoaAlias(normalized)) {
            return new LocationAliasFilter(
                    normalized,
                    KHANH_HOA_PROVINCE_DB_ALIASES_CANONICAL,
                    NHA_TRANG_CITY_DB_ALIASES_CANONICAL
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
                    HO_CHI_MINH_CITY_DB_ALIASES_CANONICAL,
                    HO_CHI_MINH_PROVINCE_DB_ALIASES_CANONICAL
            );
        }
        if (isNhaTrangAlias(normalized)) {
            return new LocationAliasFilter(
                    normalized,
                    NHA_TRANG_CITY_DB_ALIASES_CANONICAL,
                    KHANH_HOA_PROVINCE_DB_ALIASES_CANONICAL
            );
        }
        return LocationAliasFilter.exact(normalized);
    }

    private boolean isHoChiMinhAlias(String value) {
        return HO_CHI_MINH_ALIAS_KEYS.contains(normalizeAliasKey(value));
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

    private String normalizeVerificationStatus(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String normalized = value.trim().toUpperCase(Locale.ROOT);
        return ALLOWED_VERIFICATION_STATUSES.contains(normalized) ? normalized : null;
    }

    private String normalizePlaceType(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String normalized = value.trim().toUpperCase(Locale.ROOT);
        return ALLOWED_PLACE_TYPES.contains(normalized) ? normalized : null;
    }

    private int resolveMinQualityScore(String normalizedPlaceType) {
        if ("FOOD".equals(normalizedPlaceType) || "ALL".equals(normalizedPlaceType)) {
            return FOOD_PUBLIC_MIN_QUALITY_SCORE;
        }
        return DEFAULT_PUBLIC_MIN_QUALITY_SCORE;
    }

    private PlaceResponse mapPlaceResponse(ResultSet resultSet, int rowNum) throws SQLException {
        return PlaceResponse.builder()
                .id(resultSet.getLong("id"))
                .name(resultSet.getString("name"))
                .province(resultSet.getString("province"))
                .city(resultSet.getString("city"))
                .district(resultSet.getString("district"))
                .ward(resultSet.getString("ward"))
                .displayAddress(resultSet.getString("display_address"))
                .categoryId(resultSet.getLong("category_id"))
                .categoryName(resultSet.getString("category_name"))
                .categorySlug(resultSet.getString("category_slug"))
                .description(resultSet.getString("description"))
                .estimatedCost(resultSet.getBigDecimal("estimated_cost"))
                .durationMinutes(resultSet.getInt("duration_minutes"))
                .indoor(resultSet.getBoolean("indoor"))
                .verified(resultSet.getBoolean("is_verified"))
                .priceLevel(resultSet.getString("price_level"))
                .rating(resultSet.getBigDecimal("rating"))
                .verificationStatus(resultSet.getString("verification_status"))
                .popularityScore(resultSet.getBigDecimal("popularity_score"))
                .primaryImageUrl(resultSet.getString("primary_image_url"))
                .latitude(resultSet.getDouble("latitude"))
                .longitude(resultSet.getDouble("longitude"))
                .build();
    }

    private PlaceMapMarkerResponse mapPlaceMarkerResponse(ResultSet resultSet, int rowNum) throws SQLException {
        return PlaceMapMarkerResponse.builder()
                .id(resultSet.getLong("id"))
                .name(resultSet.getString("name"))
                .province(resultSet.getString("province"))
                .city(resultSet.getString("city"))
                .categoryName(resultSet.getString("category_name"))
                .categorySlug(resultSet.getString("category_slug"))
                .rating(resultSet.getBigDecimal("rating"))
                .primaryImageUrl(resultSet.getString("primary_image_url"))
                .verificationStatus(resultSet.getString("verification_status"))
                .popularityScore(resultSet.getBigDecimal("popularity_score"))
                .latitude(resultSet.getDouble("latitude"))
                .longitude(resultSet.getDouble("longitude"))
                .build();
    }

    private PlaceDetailResponse mapPlaceDetailResponse(ResultSet resultSet, int rowNum) throws SQLException {
        return PlaceDetailResponse.builder()
                .id(resultSet.getLong("id"))
                .name(resultSet.getString("name"))
                .province(resultSet.getString("province"))
                .city(resultSet.getString("city"))
                .district(resultSet.getString("district"))
                .ward(resultSet.getString("ward"))
                .displayAddress(resultSet.getString("display_address"))
                .categoryId(resultSet.getLong("category_id"))
                .categoryName(resultSet.getString("category_name"))
                .categorySlug(resultSet.getString("category_slug"))
                .description(resultSet.getString("description"))
                .estimatedCost(resultSet.getBigDecimal("estimated_cost"))
                .durationMinutes(resultSet.getInt("duration_minutes"))
                .indoor(resultSet.getBoolean("indoor"))
                .verified(resultSet.getBoolean("is_verified"))
                .priceLevel(resultSet.getString("price_level"))
                .rating(resultSet.getBigDecimal("rating"))
                .verificationStatus(resultSet.getString("verification_status"))
                .popularityScore(resultSet.getBigDecimal("popularity_score"))
                .primaryImageUrl(resultSet.getString("primary_image_url"))
                .latitude(resultSet.getDouble("latitude"))
                .longitude(resultSet.getDouble("longitude"))
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
