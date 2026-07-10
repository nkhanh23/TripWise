package com.tripwise.place.application.service.simulation;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tripwise.place.application.dto.PlaceImportRecord;
import com.tripwise.place.application.dto.StagingPlaceDetailResponse;
import com.tripwise.place.application.dto.StagingPlaceModerationResponse;
import com.tripwise.place.infrastructure.ingestion.OsmPlaceFilter;
import com.tripwise.place.infrastructure.ingestion.OsmPlaceFilterResult;
import com.tripwise.place.infrastructure.ingestion.OsmPlaceType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

@Slf4j
@Component
@RequiredArgsConstructor
public class StagingPlaceTypeReclassifier {

    private static final Set<String> KNOWN_TYPES = Set.of("ATTRACTION", "FOOD", "HOTEL", "SERVICE");
    private static final TypeReference<Map<String, Object>> RAW_PAYLOAD_TYPE = new TypeReference<>() {};
    private static final TypeReference<List<String>> STRING_LIST_TYPE = new TypeReference<>() {};

    private static final Set<String> FSQ_FOOD_KEYWORDS = Set.of(
            "dining", "restaurant", "cafe", "coffee", "tea", "bar", "pub",
            "food and beverage retail", "bakery", "food court"
    );
    private static final Set<String> FSQ_HOTEL_KEYWORDS = Set.of(
            "lodging", "hotel", "resort", "motel", "hostel", "apartment"
    );
    private static final Set<String> FSQ_ATTRACTION_KEYWORDS = Set.of(
            "spiritual", "temple", "pagoda", "landmark", "outdoor", "park",
            "museum", "art", "entertainment", "historic", "attraction",
            "beach", "waterfall", "peak", "cave", "viewpoint"
    );

    private final ObjectMapper objectMapper;
    private final OsmPlaceFilter osmPlaceFilter;

    public void reclassify(StagingPlaceDetailResponse detail) {
        if (detail == null || detail.getStagingPlace() == null) {
            return;
        }
        StagingPlaceModerationResponse staging = detail.getStagingPlace();
        String currentType = staging.getPlaceTypeDraft();

        if (currentType != null && KNOWN_TYPES.contains(currentType.toUpperCase())) {
            return;
        }

        String rawPayload = staging.getRawPayload();
        if (rawPayload == null || rawPayload.isBlank()) {
            return;
        }

        try {
            Map<String, Object> payload = objectMapper.readValue(rawPayload, RAW_PAYLOAD_TYPE);
            Map<String, String> rawTags = extractRawTags(payload);

            if (!rawTags.isEmpty()) {
                tryOsmClassification(staging, rawTags);
                return;
            }

            // No OSM tags — try Foursquare category labels
            String fsqType = classifyByFoursquareLabels(payload);
            if (fsqType != null && KNOWN_TYPES.contains(fsqType)) {
                staging.setPlaceTypeDraft(fsqType);
                log.debug("Reclassified staging ID={} from '{}' to '{}' via Foursquare labels",
                        staging.getId(), currentType, fsqType);
            }
        } catch (Exception e) {
            log.warn("Failed to reclassify staging ID={}: {}", staging.getId(), e.getMessage());
        }
    }

    private void tryOsmClassification(StagingPlaceModerationResponse staging, Map<String, String> rawTags) {
        String currentType = staging.getPlaceTypeDraft();
        PlaceImportRecord record = new PlaceImportRecord(
                null, staging.getName(),
                null, null, null, null, null, null,
                staging.getLatitude(), staging.getLongitude(),
                null, null, null, null, null, null, null,
                Set.of(), rawTags
        );
        try {
            OsmPlaceFilterResult result = osmPlaceFilter.filter(record);
            if (result.placeType() != OsmPlaceType.REJECTED) {
                String newType = result.placeType().name();
                if (KNOWN_TYPES.contains(newType)) {
                    staging.setPlaceTypeDraft(newType);
                    log.debug("Reclassified staging ID={} from '{}' to '{}' via OSM tags",
                            staging.getId(), currentType, newType);
                }
            }
        } catch (Exception e) {
            log.warn("Failed OSM classification for staging ID={}: {}", staging.getId(), e.getMessage());
        }
    }

    public String classifyByFoursquareLabels(Map<String, Object> payload) {
        List<String> labels = extractFoursquareCategoryLabels(payload);
        if (labels.isEmpty()) {
            return null;
        }

        String joined = String.join(" ", labels).toLowerCase(java.util.Locale.ROOT);

        if (containsAnyKeyword(joined, FSQ_FOOD_KEYWORDS)) {
            return "FOOD";
        }
        if (containsAnyKeyword(joined, FSQ_HOTEL_KEYWORDS)) {
            return "HOTEL";
        }
        if (containsAnyKeyword(joined, FSQ_ATTRACTION_KEYWORDS)) {
            return "ATTRACTION";
        }

        return "SERVICE";
    }

    private List<String> extractFoursquareCategoryLabels(Map<String, Object> payload) {
        Object labels = payload.get("fsq_category_labels");
        if (labels == null) {
            labels = payload.get("fsq_category_ids");
        }
        if (labels instanceof List<?> list) {
            List<String> result = new java.util.ArrayList<>();
            for (Object item : list) {
                if (item != null) {
                    result.add(item.toString().trim());
                }
            }
            return result;
        }
        if (labels instanceof String str) {
            if (str.trim().startsWith("[")) {
                try {
                    List<String> parsed = objectMapper.readValue(str, STRING_LIST_TYPE);
                    return parsed != null ? parsed : Collections.emptyList();
                } catch (Exception e) {
                    return List.of(str);
                }
            }
            return List.of(str);
        }
        return Collections.emptyList();
    }

    private boolean containsAnyKeyword(String text, Set<String> keywords) {
        String lower = text.toLowerCase(java.util.Locale.ROOT);
        for (String kw : keywords) {
            // Use word boundaries to prevent false positives like "pub" matching "public"
            String escaped = Pattern.quote(kw);
            Pattern pattern = Pattern.compile("\\b" + escaped + "\\b", Pattern.CASE_INSENSITIVE);
            if (pattern.matcher(lower).find()) {
                return true;
            }
        }
        return false;
    }

    private Map<String, String> extractRawTags(Map<String, Object> payload) {
        Object tagsObj = payload.get("rawTags");
        if (tagsObj == null) {
            tagsObj = payload.get("tags");
        }
        if (tagsObj instanceof Map<?, ?> rawMap) {
            Map<String, String> result = new java.util.LinkedHashMap<>();
            rawMap.forEach((key, value) -> {
                if (key != null && value != null) {
                    String k = key.toString().trim().toLowerCase(java.util.Locale.ROOT);
                    String v = value.toString().trim().toLowerCase(java.util.Locale.ROOT);
                    if (!k.isBlank() && !v.isBlank()) {
                        result.put(k, v);
                    }
                }
            });
            return result;
        }
        return Map.of();
    }

}
