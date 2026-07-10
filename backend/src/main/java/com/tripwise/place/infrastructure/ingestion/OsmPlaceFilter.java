package com.tripwise.place.infrastructure.ingestion;

import com.tripwise.place.application.dto.PlaceImportRecord;
import org.springframework.stereotype.Component;

import java.text.Normalizer;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Component
public class OsmPlaceFilter {

    private static final Set<String> REJECTED_AMENITIES = Set.of(
            "parking",
            "toilets",
            "bench",
            "waste_basket",
            "atm",
            "fuel",
            "bank",
            "school",
            "casino",
            "karaoke"
    );

    private static final Set<String> ATTRACTION_TOURISM_VALUES = Set.of(
            "attraction",
            "viewpoint",
            "museum",
            "gallery",
            "theme_park",
            "zoo",
            "aquarium"
    );

    private static final Set<String> SPECIFIC_STRONG_TOURISM_VALUES = Set.of(
            "viewpoint",
            "museum",
            "gallery",
            "theme_park",
            "zoo",
            "aquarium"
    );

    private static final Set<String> ATTRACTION_LEISURE_VALUES = Set.of(
            "park",
            "garden",
            "nature_reserve",
            "water_park"
    );

    private static final Set<String> ATTRACTION_AMENITY_VALUES = Set.of(
            "theatre",
            "arts_centre"
    );

    private static final Set<String> ATTRACTION_NATURAL_VALUES = Set.of(
            "beach",
            "waterfall",
            "peak",
            "cave_entrance",
            "bay"
    );

    private static final Set<String> STRONG_HISTORIC_ATTRACTION_VALUES = Set.of(
            "castle",
            "archaeological_site",
            "fort",
            "ruins",
            "city_gate",
            "temple",
            "monastery"
    );

    private static final Set<String> WEAK_HISTORIC_ATTRACTION_VALUES = Set.of(
            "memorial",
            "monument",
            "tomb",
            "wayside_shrine",
            "wayside_cross"
    );

    private static final Set<String> FOOD_AMENITY_VALUES = Set.of(
            "restaurant",
            "cafe",
            "bar",
            "fast_food",
            "food_court",
            "bakery"
    );

    private static final Set<String> HOTEL_TOURISM_VALUES = Set.of(
            "hotel",
            "guest_house",
            "hostel",
            "resort",
            "apartment"
    );

    private static final Set<String> SERVICE_AMENITY_VALUES = Set.of(
            "pub",
            "ice_cream",
            "marketplace",
            "library",
            "cinema",
            "fountain"
    );

    private static final Set<String> SERVICE_TOURISM_VALUES = Set.of(
            "artwork",
            "picnic_site",
            "information"
    );

    private static final Set<String> SERVICE_NATURAL_VALUES = Set.of("hot_spring");

    private static final Set<String> SERVICE_LEISURE_VALUES = Set.of(
            "marina",
            "sports_centre",
            "stadium",
            "golf_course",
            "amusement_arcade"
    );

    private static final Set<String> SERVICE_HISTORIC_VALUES = Set.of(
            "monument",
            "castle",
            "ruins",
            "archaeological_site",
            "memorial",
            "fort",
            "tower",
            "tomb",
            "wayside_shrine",
            "wayside_cross"
    );

    private static final Set<String> SERVICE_BUILDING_VALUES = Set.of(
            "cathedral",
            "mosque",
            "temple",
            "pagoda",
            "church",
            "shrine",
            "stupa",
            "synagogue"
    );

    private static final Pattern DIGITS_ONLY_PATTERN = Pattern.compile("^\\d+$");
    private static final Pattern PHONE_NUMBER_PATTERN = Pattern.compile("^\\+?[\\d\\s().-]{8,}$");
    private static final Pattern DISTANCE_MARKER_PATTERN = Pattern.compile("^\\d+(?:[.,]\\d+)?\\s*(km|m)$", Pattern.CASE_INSENSITIVE);
    private static final Pattern TEMPERATURE_PATTERN = Pattern.compile("[-+]?\\d+\\s*°\\s*[CF]", Pattern.CASE_INSENSITIVE);
    private static final Pattern CODE_LIKE_NAME_PATTERN = Pattern.compile("^[A-Z]{2,}[A-Z0-9-]*\\d+[A-Z0-9-]*$");
    private static final Pattern ADDRESS_LIKE_PATTERN = Pattern.compile(
            "^\\d+[A-Za-z/-]*\\s+(duong|đường|street|st\\.?|road|rd\\.?|avenue|ave\\.?|pho|phố|hem|hẻm|nguyen|trần|le|lê|pham|phạm|vo|võ|hoang|hoàng)\\b.*",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE
    );

    private static final Set<String> BUSINESS_KEYWORDS_NORMALIZED;
    private static final Set<String> GENERIC_EDITORIAL_VIEWPOINT_NAMES = Set.of(
            "crowd watching",
            "view on the bay",
            "sunrise viewpoint",
            "viewpoint on the rocks",
            "grasslands observation tower (west)",
            "hard to climb",
            "easy to climb",
            "difficult to climb",
            "nice view",
            "good view",
            "beautiful view",
            "scenic view"
    );
    private static final Set<String> LOW_IDENTITY_VIEWPOINT_GENERIC_TOKENS = Set.of(
            "viewpoint",
            "view",
            "point",
            "observation",
            "tower",
            "unnamed",
            "sunrise",
            "sunset",
            "grasslands",
            "rocks",
            "rock",
            "west",
            "east",
            "north",
            "south",
            "on",
            "the",
            "of",
            "at"
    );

    static {
        Set<String> rawKeywords = Set.of(
                "office", "sales office", "booking office",
                "company", "co., ltd", "ltd", "corporation", "corp",
                "store", "shop", "showroom", "agency",
                "real estate", "travel agency", "tour office", "ticket office",
                "van phong", "van phong ban", "phong ve", "dai ly", "cong ty",
                "cua hang", "cua hieu", "chi nhanh", "nha phan phoi",
                "ban tour", "ban ve", "chuyen ca canh", "ca canh",
                "phu kien", "dich vu"
        );
        BUSINESS_KEYWORDS_NORMALIZED = rawKeywords.stream()
                .map(k -> Normalizer.normalize(k, Normalizer.Form.NFD)
                        .replaceAll("\\p{M}", "")
                        .toLowerCase(Locale.ROOT))
                .collect(Collectors.toUnmodifiableSet());
    }

    public OsmPlaceFilterResult filter(PlaceImportRecord record) {
        String name = trimToNull(record.name());
        if (name == null) {
            return rejected("Missing place name");
        }

        String explicitCategorySlug = trimToNull(record.categorySlug());
        if (explicitCategorySlug != null) {
            OsmPlaceType inferredType = inferTypeFromCategory(explicitCategorySlug);
            int tourismRelevanceScore = computeTourismRelevanceScore(inferredType, Map.of());
            int completenessScore = computeCompletenessScore(record, Map.of(), explicitCategorySlug);
            String promotionGuardReason = evaluatePromotionGuard(inferredType, name, Map.of(), record.description());
            return new OsmPlaceFilterResult(
                    inferredType,
                    explicitCategorySlug,
                    null,
                    clampQualityScore(tourismRelevanceScore + completenessScore),
                    tourismRelevanceScore,
                    completenessScore,
                    inferredType == OsmPlaceType.ATTRACTION,
                    promotionGuardReason
            );
        }

        Map<String, String> rawTags = normalizeRawTags(record.rawTags());
        String rejectReason = rejectReasonByTags(rawTags);
        if (rejectReason != null) {
            return rejected(rejectReason);
        }

        OsmPlaceType placeType = classifyPlaceType(rawTags);
        if (placeType == null) {
            return rejected("Unsupported OSM tag combination");
        }

        String invalidNameReason = invalidNameReason(name);
        if (invalidNameReason != null) {
            return rejected(invalidNameReason);
        }

        String normalizedCategory = resolveNormalizedCategory(placeType, rawTags);
        int tourismRelevanceScore = computeTourismRelevanceScore(placeType, rawTags);
        int completenessScore = computeCompletenessScore(record, rawTags, normalizedCategory);
        int qualityScore = clampQualityScore(tourismRelevanceScore + completenessScore);
        boolean strongTourismSignal = hasStrongTourismSignal(placeType, rawTags);
        String promotionGuardReason = evaluatePromotionGuard(placeType, name, rawTags, record.description());

        return new OsmPlaceFilterResult(
                placeType,
                normalizedCategory,
                null,
                qualityScore,
                tourismRelevanceScore,
                completenessScore,
                strongTourismSignal,
                promotionGuardReason
        );
    }

    private String rejectReasonByTags(Map<String, String> rawTags) {
        if (rawTags.isEmpty()) {
            return "Missing OSM tags";
        }

        if (rawTags.containsKey("shop")) {
            return "Rejected by tag shop=*";
        }
        if (rawTags.containsKey("office")) {
            return "Rejected by tag office=*";
        }
        if (rawTags.containsKey("highway")) {
            return "Rejected by tag highway=*";
        }
        if (rawTags.containsKey("railway")) {
            return "Rejected by tag railway=*";
        }
        if (rawTags.containsKey("power")) {
            return "Rejected by tag power=*";
        }
        if (rawTags.containsKey("barrier")) {
            return "Rejected by tag barrier=*";
        }

        String amenity = rawTags.get("amenity");
        if (amenity != null && REJECTED_AMENITIES.contains(amenity)) {
            return "Rejected by amenity=" + amenity;
        }

        return null;
    }

    private OsmPlaceType classifyPlaceType(Map<String, String> rawTags) {
        String tourism = rawTags.get("tourism");
        String historic = rawTags.get("historic");
        String natural = rawTags.get("natural");
        String leisure = rawTags.get("leisure");
        String amenity = rawTags.get("amenity");
        String building = rawTags.get("building");

        if (tourism != null && HOTEL_TOURISM_VALUES.contains(tourism)) {
            return OsmPlaceType.HOTEL;
        }

        if (amenity != null && FOOD_AMENITY_VALUES.contains(amenity)) {
            return OsmPlaceType.FOOD;
        }

        if (tourism != null && ATTRACTION_TOURISM_VALUES.contains(tourism)) {
            return OsmPlaceType.ATTRACTION;
        }
        if (historic != null) {
            return OsmPlaceType.ATTRACTION;
        }
        if (natural != null && ATTRACTION_NATURAL_VALUES.contains(natural)) {
            return OsmPlaceType.ATTRACTION;
        }
        if (leisure != null && ATTRACTION_LEISURE_VALUES.contains(leisure)) {
            return OsmPlaceType.ATTRACTION;
        }
        if (amenity != null && ATTRACTION_AMENITY_VALUES.contains(amenity)) {
            return OsmPlaceType.ATTRACTION;
        }

        if (amenity != null && SERVICE_AMENITY_VALUES.contains(amenity)) {
            return OsmPlaceType.SERVICE;
        }
        if (tourism != null && SERVICE_TOURISM_VALUES.contains(tourism)) {
            return OsmPlaceType.SERVICE;
        }
        if (natural != null && SERVICE_NATURAL_VALUES.contains(natural)) {
            return OsmPlaceType.SERVICE;
        }
        if (leisure != null && SERVICE_LEISURE_VALUES.contains(leisure)) {
            return OsmPlaceType.SERVICE;
        }
        if (historic != null && SERVICE_HISTORIC_VALUES.contains(historic)) {
            return OsmPlaceType.SERVICE;
        }
        if (building != null && SERVICE_BUILDING_VALUES.contains(building)) {
            return OsmPlaceType.SERVICE;
        }

        return null;
    }

    private String resolveNormalizedCategory(OsmPlaceType placeType, Map<String, String> rawTags) {
        if (placeType == OsmPlaceType.FOOD) {
            return "food";
        }
        if (placeType == OsmPlaceType.HOTEL) {
            return "hotel";
        }
        if (placeType == OsmPlaceType.SERVICE) {
            String amenity = rawTags.get("amenity");
            String tourism = rawTags.get("tourism");
            String leisure = rawTags.get("leisure");
            String natural = rawTags.get("natural");
            String building = rawTags.get("building");

            if ("marketplace".equals(amenity)) {
                return "shopping";
            }
            if ("library".equals(amenity) || "artwork".equals(tourism)) {
                return "culture";
            }
            if ("cinema".equals(amenity) || leisure != null && Set.of("stadium", "sports_centre", "golf_course").contains(leisure)) {
                return "entertainment";
            }
            if ("hot_spring".equals(natural) || "marina".equals(leisure)) {
                return "nature";
            }
            if ((amenity != null && Set.of("fountain", "ice_cream", "pub").contains(amenity))
                    || tourism != null && Set.of("picnic_site", "information").contains(tourism)) {
                return "check-in";
            }
            if (building != null && SERVICE_BUILDING_VALUES.contains(building)) {
                return "spiritual";
            }
            return "service";
        }

        String tourism = rawTags.get("tourism");
        String natural = rawTags.get("natural");
        String leisure = rawTags.get("leisure");
        String amenity = rawTags.get("amenity");
        String historic = rawTags.get("historic");

        if ("museum".equals(tourism) || "gallery".equals(tourism) || historic != null) {
            return "culture";
        }
        if ("theme_park".equals(tourism) || "zoo".equals(tourism) || "aquarium".equals(tourism)
                || "water_park".equals(leisure) || amenity != null && ATTRACTION_AMENITY_VALUES.contains(amenity)) {
            return "entertainment";
        }
        if ("beach".equals(natural)) {
            return "beach";
        }
        if (natural != null && Set.of("waterfall", "peak", "cave_entrance", "bay").contains(natural)) {
            return "nature";
        }
        if (leisure != null && Set.of("park", "garden", "nature_reserve").contains(leisure)) {
            return "nature";
        }
        if ("viewpoint".equals(tourism) || "attraction".equals(tourism)) {
            return "check-in";
        }

        return "check-in";
    }

    private String invalidNameReason(String name) {
        String normalizedName = normalizeForComparison(name);
        if (normalizedName.isBlank()) {
            return "Blank place name";
        }
        if (PHONE_NUMBER_PATTERN.matcher(normalizedName).matches()) {
            return "Name looks like a phone number";
        }
        if (DIGITS_ONLY_PATTERN.matcher(normalizedName).matches()) {
            return "Name contains digits only";
        }
        if (DISTANCE_MARKER_PATTERN.matcher(normalizedName).matches()) {
            return "Name looks like a distance marker";
        }
        if (ADDRESS_LIKE_PATTERN.matcher(normalizedName).matches()) {
            return "Name looks like a street address";
        }
        if (TEMPERATURE_PATTERN.matcher(name).find()) {
            return "Name contains temperature-style marketing text";
        }
        if (looksLikeSlogan(normalizedName)) {
            return "Name looks like a slogan or campaign text";
        }
        if (hasOnlySpecialCharacters(normalizedName)) {
            return "Name consists only of special characters or punctuation";
        }
        return null;
    }

    private boolean looksLikeSlogan(String normalizedName) {
        if (!normalizedName.contains(" ")) {
            return false;
        }

        List<String> sloganTokens = List.of(
                "chung tay",
                "bao ve",
                "moi truong",
                "hanh dong",
                "vi mot",
                "thong diep",
                "campaign"
        );

        return sloganTokens.stream().anyMatch(normalizedName::contains);
    }

    private boolean hasOnlySpecialCharacters(String normalizedName) {
        return normalizedName.replaceAll("[\\p{P}\\p{S}]", "").isBlank();
    }

    private int computeTourismRelevanceScore(OsmPlaceType placeType, Map<String, String> rawTags) {
        if (placeType == OsmPlaceType.REJECTED) {
            return 0;
        }

        return switch (placeType) {
            case ATTRACTION -> attractionRelevanceScore(rawTags);
            case FOOD -> 50;
            case HOTEL -> 48;
            case SERVICE -> 30;
            case REJECTED -> 0;
        };
    }

    private int attractionRelevanceScore(Map<String, String> rawTags) {
        String tourism = rawTags.get("tourism");
        String leisure = rawTags.get("leisure");
        String amenity = rawTags.get("amenity");
        String natural = rawTags.get("natural");
        String historic = rawTags.get("historic");

        if (tourism != null && ATTRACTION_TOURISM_VALUES.contains(tourism)) {
            return 62;
        }
        if (natural != null && ATTRACTION_NATURAL_VALUES.contains(natural)) {
            return 62;
        }
        if (historic != null && STRONG_HISTORIC_ATTRACTION_VALUES.contains(historic)) {
            return 52;
        }
        if ((leisure != null && ATTRACTION_LEISURE_VALUES.contains(leisure))
                || (amenity != null && ATTRACTION_AMENITY_VALUES.contains(amenity))) {
            return 55;
        }
        if (historic != null && WEAK_HISTORIC_ATTRACTION_VALUES.contains(historic)) {
            return 40;
        }
        if (historic != null) {
            return 46;
        }
        return 48;
    }

    private int computeCompletenessScore(
            PlaceImportRecord record,
            Map<String, String> rawTags,
            String normalizedCategory
    ) {
        int score = 0;

        if (record.latitude() != null && record.longitude() != null) {
            score += 8;
        }
        if (record.sourceExternalId() != null && !record.sourceExternalId().isBlank()) {
            score += 6;
        }
        if (record.displayAddress() != null && !record.displayAddress().isBlank()) {
            score += 6;
        }
        if (record.province() != null && !record.province().isBlank()) {
            score += 2;
        }
        if (record.city() != null && !record.city().isBlank()) {
            score += 2;
        }
        if (record.district() != null && !record.district().isBlank()) {
            score += 1;
        }
        if (record.ward() != null && !record.ward().isBlank()) {
            score += 1;
        }
        if (record.description() != null && !record.description().isBlank()) {
            score += 3;
        }
        if (record.tags() != null && !record.tags().isEmpty()) {
            score += Math.min(2, record.tags().size());
        }
        if (rawTags.size() >= 2) {
            score += 4;
        } else if (!rawTags.isEmpty()) {
            score += 2;
        }
        if (normalizedCategory != null && !"service".equals(normalizedCategory) && !"hotel".equals(normalizedCategory)) {
            score += 2;
        }
        if (hasExternalTrustSignal(rawTags)) {
            score += 4;
        }

        return score;
    }

    private boolean hasStrongTourismSignal(OsmPlaceType placeType, Map<String, String> rawTags) {
        if (placeType != OsmPlaceType.ATTRACTION) {
            return false;
        }

        String tourism = rawTags.get("tourism");
        String leisure = rawTags.get("leisure");
        String amenity = rawTags.get("amenity");
        String natural = rawTags.get("natural");
        String historic = rawTags.get("historic");

        return (tourism != null && (SPECIFIC_STRONG_TOURISM_VALUES.contains(tourism) || "attraction".equals(tourism)))
                || (natural != null && ATTRACTION_NATURAL_VALUES.contains(natural))
                || (leisure != null && ATTRACTION_LEISURE_VALUES.contains(leisure))
                || (amenity != null && ATTRACTION_AMENITY_VALUES.contains(amenity))
                || (historic != null && STRONG_HISTORIC_ATTRACTION_VALUES.contains(historic));
    }

    private boolean hasExternalTrustSignal(Map<String, String> rawTags) {
        return rawTags.containsKey("wikidata")
                || rawTags.containsKey("wikipedia")
                || rawTags.containsKey("website")
                || rawTags.containsKey("contact:website");
    }

    private boolean hasCompensatingStrongSignal(Map<String, String> rawTags, String description) {
        String tourism = rawTags.get("tourism");
        String natural = rawTags.get("natural");
        String historic = rawTags.get("historic");
        return hasExternalTrustSignal(rawTags)
                || (description != null && !description.isBlank())
                || (tourism != null && SPECIFIC_STRONG_TOURISM_VALUES.contains(tourism))
                || (natural != null && ATTRACTION_NATURAL_VALUES.contains(natural))
                || (historic != null && STRONG_HISTORIC_ATTRACTION_VALUES.contains(historic));
    }

    private int clampQualityScore(int score) {
        return Math.min(score, 100);
    }

    private Map<String, String> normalizeRawTags(Map<String, String> rawTags) {
        if (rawTags == null || rawTags.isEmpty()) {
            return Map.of();
        }

        Map<String, String> normalized = new LinkedHashMap<>();
        rawTags.forEach((key, value) -> {
            if (key == null || value == null || key.isBlank() || value.isBlank()) {
                return;
            }
            normalized.put(
                    key.trim().toLowerCase(Locale.ROOT),
                    value.trim().toLowerCase(Locale.ROOT)
            );
        });
        return normalized;
    }

    private String normalizeForComparison(String value) {
        if (value == null) {
            return "";
        }
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        return normalized
                .replace('"', ' ')
                .replace('“', ' ')
                .replace('”', ' ')
                .trim()
                .toLowerCase(Locale.ROOT);
    }

    private OsmPlaceType inferTypeFromCategory(String categorySlug) {
        String normalized = categorySlug.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "food" -> OsmPlaceType.FOOD;
            case "hotel" -> OsmPlaceType.HOTEL;
            case "shopping", "service" -> OsmPlaceType.SERVICE;
            default -> OsmPlaceType.ATTRACTION;
        };
    }

    private String evaluatePromotionGuard(
            OsmPlaceType placeType,
            String name,
            Map<String, String> rawTags,
            String description
    ) {
        if (placeType != OsmPlaceType.ATTRACTION) {
            return null;
        }

        String normalizedName = normalizeForComparison(name);
        if (hasBusinessKeyword(normalizedName)) {
            return "Business/office keyword detected in name";
        }

        if (rawTags == null || rawTags.isEmpty()) {
            return null;
        }

        String historic = rawTags.get("historic");
        if (historic != null && WEAK_HISTORIC_ATTRACTION_VALUES.contains(historic)) {
            if (!hasCompensatingStrongSignal(rawTags, description)) {
                return "Weak historic type without trust signal: " + historic;
            }
        }

        String leisure = rawTags.get("leisure");
        if ("amusement_arcade".equals(leisure)) {
            return "Amusement arcade is not a tourist attraction";
        }

        if (hasExhibitionKeyword(normalizedName)
                && !hasExternalTrustSignal(rawTags)
                && (description == null || description.isBlank())) {
            return "Exhibition/showroom keyword detected in name";
        }

        if ("theme_park".equals(rawTags.get("tourism")) && hasGenericParkName(normalizedName)
                && !hasExternalTrustSignal(rawTags)
                && (description == null || description.isBlank())) {
            return "Theme park with generic park name, missing trust signal";
        }

        String amenity = rawTags.get("amenity");
        if ("ferry_terminal".equals(amenity)) {
            return "Ferry terminal is not a tourist attraction";
        }

        String tourism = rawTags.get("tourism");
        boolean genericViewpointOrAttraction = "viewpoint".equals(tourism) || "attraction".equals(tourism);
        boolean hasExternalTrustSignal = hasExternalTrustSignal(rawTags);
        boolean hasTrustSignalForPlaceOfWorship = hasTrustSignalForGuard(rawTags, description);
        if (genericViewpointOrAttraction && "post_office".equals(amenity) && !hasExternalTrustSignal) {
            return "Viewpoint/attraction tagged as post office without trust signal";
        }

        if (genericViewpointOrAttraction && isCodeLikeName(name) && !hasExternalTrustSignal) {
            return "Code-like attraction/viewpoint name without trust signal";
        }

        if ("viewpoint".equals(tourism) && "shelter".equals(amenity) && !hasExternalTrustSignal) {
            return "Viewpoint tagged as shelter without trust signal";
        }

        if (genericViewpointOrAttraction && hasLowIdentityViewpointName(normalizedName) && !hasExternalTrustSignal) {
            return "Low-identity viewpoint name without trust signal";
        }

        if ("place_of_worship".equals(amenity)) {
            boolean hasSpecificTourism = tourism != null && !"attraction".equals(tourism)
                    && ATTRACTION_TOURISM_VALUES.contains(tourism);
            boolean hasStrongHistoric = historic != null && STRONG_HISTORIC_ATTRACTION_VALUES.contains(historic);
            if (!hasSpecificTourism && !hasStrongHistoric && !hasTrustSignalForPlaceOfWorship) {
                return "Place of worship without strong tourism or trust signal";
            }
        }

        return null;
    }

    private boolean hasTrustSignalForGuard(Map<String, String> rawTags, String description) {
        return hasExternalTrustSignal(rawTags)
                || (description != null && !description.isBlank());
    }

    private boolean hasBusinessKeyword(String normalizedName) {
        return BUSINESS_KEYWORDS_NORMALIZED.stream().anyMatch(normalizedName::contains);
    }

    private boolean isCodeLikeName(String name) {
        if (name == null || name.isBlank() || name.contains(" ")) {
            return false;
        }
        return CODE_LIKE_NAME_PATTERN.matcher(name.trim()).matches();
    }

    private boolean hasGenericEditorialViewpointName(String normalizedName) {
        return GENERIC_EDITORIAL_VIEWPOINT_NAMES.contains(normalizedName);
    }

    private boolean hasLowIdentityViewpointName(String normalizedName) {
        if (normalizedName.contains("unnamed")) {
            return true;
        }
        if (hasGenericEditorialViewpointName(normalizedName)) {
            return true;
        }

        String compact = normalizedName.replaceAll("\\s+", " ").trim();
        if (hasEditorialInstructionalViewpointPhrase(compact)) {
            return true;
        }
        boolean genericViewpointShape = compact.startsWith("viewpoint ")
                || compact.endsWith(" viewpoint")
                || compact.startsWith("view point ")
                || compact.endsWith(" view point")
                || compact.startsWith("observation tower ")
                || compact.endsWith(" observation tower")
                || compact.contains(" observation tower ");

        if (!genericViewpointShape) {
            return false;
        }

        List<String> tokens = List.of(compact.split("[^\\p{L}\\p{Nd}]+"));
        return tokens.stream()
                .filter(token -> !token.isBlank())
                .allMatch(LOW_IDENTITY_VIEWPOINT_GENERIC_TOKENS::contains);
    }

    private boolean hasEditorialInstructionalViewpointPhrase(String normalizedName) {
        return GENERIC_EDITORIAL_VIEWPOINT_NAMES.contains(normalizedName);
    }

    private boolean hasExhibitionKeyword(String normalizedName) {
        return normalizedName.contains("phong trung bay");
    }

    private boolean hasGenericParkName(String normalizedName) {
        boolean hasParkKeyword = normalizedName.contains("cong vien") || normalizedName.contains("park");
        if (!hasParkKeyword) {
            return false;
        }
        boolean hasAmusementSignal = normalizedName.contains("theme")
                || normalizedName.contains("amusement")
                || normalizedName.contains("vui choi")
                || normalizedName.contains("giai tri")
                || normalizedName.contains("water park")
                || normalizedName.contains("cong vien nuoc");
        return !hasAmusementSignal;
    }

    private String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private OsmPlaceFilterResult rejected(String reason) {
        return new OsmPlaceFilterResult(OsmPlaceType.REJECTED, null, reason, 0, 0, 0, false, null);
    }
}
