package com.tripwise.place.application.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tripwise.place.application.dto.PlaceImportRecord;
import com.tripwise.place.application.dto.StagingPlaceDetailResponse;
import com.tripwise.place.application.dto.StagingPlaceModerationResponse;
import com.tripwise.place.application.service.simulation.AutoModerationRule;
import com.tripwise.place.application.service.simulation.AutoModerationRuleEngine;
import com.tripwise.place.application.service.simulation.SimulationCategory;
import com.tripwise.place.application.service.simulation.StagingPlaceTypeReclassifier;
import com.tripwise.place.infrastructure.ingestion.OsmPlaceFilter;
import com.tripwise.place.infrastructure.ingestion.OsmPlaceFilterResult;
import com.tripwise.place.infrastructure.ingestion.OsmPlaceType;
import com.tripwise.place.infrastructure.persistence.PlaceStagingModerationJdbcRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class SimulationDiagnosticService {

    private static final Set<String> KNOWN_TYPES = Set.of("ATTRACTION", "FOOD", "HOTEL", "SERVICE");
    private static final TypeReference<Map<String, Object>> RAW_PAYLOAD_TYPE = new TypeReference<>() {};

    private final PlaceStagingModerationJdbcRepository repository;
    private final StagingPlaceTypeReclassifier reclassifier;
    private final AutoModerationRuleEngine ruleEngine;
    private final List<AutoModerationRule> allRules;
    private final OsmPlaceFilter osmPlaceFilter;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public Map<String, Object> runDiagnostic(String province, String city, int sampleSize) {
        List<Long> ids = repository.findPendingStagingIds(province, city);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalPending", ids.size());
        result.put("province", province);
        result.put("city", city);

        List<Map<String, Object>> samples = new ArrayList<>();
        Map<String, Integer> tagPatternCounts = new LinkedHashMap<>();
        Map<String, Integer> filterResultCounts = new LinkedHashMap<>();
        Map<String, Integer> amenityCounts = new LinkedHashMap<>();
        Map<String, Integer> topLevelKeys = new LinkedHashMap<>();
        int reclassifierChanged = 0;
        int reclassifierNotChanged = 0;
        int reclassifierSkipped = 0;
        int reclassifierSkippedAlreadyKnown = 0;
        int reclassifierNoPayload = 0;
        int reclassifierEmptyTags = 0;
        int reclassifierRejected = 0;
        int reclassifierError = 0;

        int checked = 0;
        for (Long id : ids) {
            checked++;
            boolean isSample = checked <= sampleSize || sampleSize <= 0;
            boolean recordAmbiguous = false;

            try {
                StagingPlaceDetailResponse detail = repository.findById(id).orElse(null);
                if (detail == null) continue;

                StagingPlaceModerationResponse staging = detail.getStagingPlace();

                String initialType = staging.getPlaceTypeDraft();
                String initialModerationStatus = staging.getModerationStatus();
                String source = staging.getSource();
                String sourcePlaceId = staging.getSourcePlaceId();
                String name = staging.getName();
                String rawPayloadRaw = staging.getRawPayload();

                // Check if this record is ambiguous
                boolean initKnown = initialType != null && KNOWN_TYPES.contains(initialType.toUpperCase());

                // Phase 1: Before reclassifier
                AutoModerationRuleEngine.EvaluationResult beforeResult = ruleEngine.evaluate(detail);

                // Now run reclassifier
                reclassifier.reclassify(detail);
                String afterType = staging.getPlaceTypeDraft();

                // Phase 2: After reclassifier
                AutoModerationRuleEngine.EvaluationResult afterResult = ruleEngine.evaluate(detail);

                boolean typeChanged = !java.util.Objects.equals(initialType, afterType);

                // Analyze raw payload
                Map<String, Object> rawPayloadParsed = null;
                Map<String, String> extractedTags = Map.of();
                List<String> topKeys = new ArrayList<>();
                Map<String, String> amenityTag = new LinkedHashMap<>();
                String osmTypeValue = null;
                String osmName = null;

                if (rawPayloadRaw != null && !rawPayloadRaw.isBlank()) {
                    try {
                        rawPayloadParsed = objectMapper.readValue(rawPayloadRaw, RAW_PAYLOAD_TYPE);
                        topKeys.addAll(rawPayloadParsed.keySet());

                        // Extract tags for analysis
                        Object tagsObj = rawPayloadParsed.get("rawTags");
                        if (tagsObj == null) tagsObj = rawPayloadParsed.get("tags");
                        if (tagsObj instanceof Map<?, ?> rawMap) {
                            for (Map.Entry<?, ?> e : rawMap.entrySet()) {
                                if (e.getKey() != null && e.getValue() != null) {
                                    extractedTags.put(
                                        e.getKey().toString().toLowerCase(java.util.Locale.ROOT),
                                        e.getValue().toString().toLowerCase(java.util.Locale.ROOT)
                                    );
                                }
                            }
                        }

                        // Get top-level osm_type
                        Object typeVal = rawPayloadParsed.get("osm_type");
                        if (typeVal == null) typeVal = rawPayloadParsed.get("type");
                        osmTypeValue = typeVal != null ? typeVal.toString() : null;

                        Object nameVal = rawPayloadParsed.get("name");
                        if (nameVal == null && !extractedTags.isEmpty()) nameVal = extractedTags.get("name");
                        osmName = nameVal != null ? nameVal.toString() : null;

                        if (extractedTags.containsKey("amenity")) {
                            amenityTag.put("amenity", extractedTags.get("amenity"));
                            amenityCounts.merge(extractedTags.get("amenity"), 1, Integer::sum);
                        }
                        if (extractedTags.containsKey("cuisine")) {
                            amenityTag.put("cuisine", extractedTags.get("cuisine"));
                            amenityCounts.merge("cuisine:" + extractedTags.get("cuisine"), 1, Integer::sum);
                        }

                        // Tag pattern analysis
                        String pattern = buildTagPattern(extractedTags, initialType);
                        tagPatternCounts.merge(pattern, 1, Integer::sum);

                        // Track top-level keys
                        for (String key : rawPayloadParsed.keySet()) {
                            if (!key.startsWith("@")) {
                                topLevelKeys.merge(key, 1, Integer::sum);
                            }
                        }
                    } catch (Exception e) {
                        // ignore parse errors in diagnostic
                    }
                }

                // Now test what OsmPlaceFilter would do
                String filterOutcome = "NOT_TESTED";
                if (!extractedTags.isEmpty()) {
                    try {
                        PlaceImportRecord testRecord = new PlaceImportRecord(
                            null, name != null ? name : "", null, null, null, null, null, null,
                            staging.getLatitude(), staging.getLongitude(),
                            null, null, null, null, null, null, null,
                            Set.of(), extractedTags
                        );
                        OsmPlaceFilterResult filterResult = osmPlaceFilter.filter(testRecord);
                        if (filterResult.placeType() == OsmPlaceType.REJECTED) {
                            filterOutcome = "REJECTED:" + filterResult.rejectReason();
                        } else {
                            filterOutcome = filterResult.placeType().name();
                        }
                    } catch (Exception e) {
                        filterOutcome = "ERROR:" + e.getMessage();
                    }
                }

                // Check for Foursquare labels
                boolean hasFsqLabels = false;
                if (rawPayloadParsed != null) {
                    Object fsqLabels = rawPayloadParsed.get("fsq_category_labels");
                    hasFsqLabels = fsqLabels != null
                            && ((fsqLabels instanceof List<?> l && !l.isEmpty())
                                || (fsqLabels instanceof String s && !s.isBlank() && !"[]".equals(s.trim())));
                }

                // Track reclassifier stats
                if (initKnown) {
                    reclassifierSkippedAlreadyKnown++;
                } else if (typeChanged) {
                    reclassifierChanged++;
                } else if (rawPayloadRaw == null || rawPayloadRaw.isBlank()) {
                    reclassifierNoPayload++;
                } else if (extractedTags.isEmpty() && !hasFsqLabels) {
                    reclassifierEmptyTags++;
                } else if (extractedTags.isEmpty() && hasFsqLabels) {
                    // Has Foursquare labels but reclassifier didn't change type
                    reclassifierNotChanged++;
                } else if (filterOutcome != null && filterOutcome.startsWith("REJECTED")) {
                    reclassifierRejected++;
                } else if (!typeChanged && !extractedTags.isEmpty()) {
                    reclassifierNotChanged++;
                } else {
                    reclassifierSkipped++;
                }

                if (beforeResult.category() == SimulationCategory.NEEDS_ADMIN_REVIEW
                    && "Ambiguous place type".equals(beforeResult.subCategory())) {
                    recordAmbiguous = true;
                }

                // Extract Foursquare labels for samples
                List<String> fsqLabels = new ArrayList<>();
                String fsqReclassified = null;
                if (rawPayloadParsed != null) {
                    Object labelsObj = rawPayloadParsed.get("fsq_category_labels");
                    if (labelsObj instanceof List<?> list) {
                        for (Object item : list) {
                            if (item != null) fsqLabels.add(item.toString());
                        }
                    } else if (labelsObj != null) {
                        fsqLabels.add(labelsObj.toString());
                    }
                    if (!fsqLabels.isEmpty()) {
                        fsqReclassified = reclassifier.classifyByFoursquareLabels(rawPayloadParsed);
                    }
                }

                if (isSample && recordAmbiguous) {
                    Map<String, Object> sample = new LinkedHashMap<>();
                    sample.put("id", id);
                    sample.put("source", source);
                    sample.put("sourcePlaceId", sourcePlaceId);
                    sample.put("name", name);
                    sample.put("initialType", initialType);
                    sample.put("afterType", afterType);
                    sample.put("typeChanged", typeChanged);
                    sample.put("osType", osmTypeValue);
                    sample.put("osmName", osmName);
                    sample.put("moderationStatus", initialModerationStatus);
                    sample.put("rawPayloadKeys", topKeys);
                    sample.put("extractedTags", extractedTags);
                    sample.put("amenityTag", amenityTag);
                    sample.put("fsqCategoryLabels", fsqLabels);
                    sample.put("fsqReclassifiedTo", fsqReclassified);
                    sample.put("filterOutcome", filterOutcome);
                    sample.put("initKnown", initKnown);
                    sample.put("beforeResult", beforeResult.category() + ":" + beforeResult.subCategory());
                    sample.put("afterResult", afterResult.category() + ":" + afterResult.subCategory());
                    sample.put("rawPayloadPreview", rawPayloadRaw != null ? rawPayloadRaw.substring(0, Math.min(rawPayloadRaw.length(), 300)) : null);
                    samples.add(sample);
                }

                filterResultCounts.merge(filterOutcome, 1, Integer::sum);

            } catch (Exception e) {
                log.error("Error processing record ID={}", id, e);
            }
        }

        result.put("samplesExamined", Math.min(sampleSize, ids.size()));
        result.put("samples", samples);

        Map<String, Object> reclassStats = new LinkedHashMap<>();
        reclassStats.put("alreadyKnown", reclassifierSkippedAlreadyKnown);
        reclassStats.put("changed", reclassifierChanged);
        reclassStats.put("notChanged", reclassifierNotChanged);
        reclassStats.put("noRawPayload", reclassifierNoPayload);
        reclassStats.put("emptyTags", reclassifierEmptyTags);
        reclassStats.put("filterRejected", reclassifierRejected);
        reclassStats.put("skipped", reclassifierSkipped);
        result.put("reclassifierStats", reclassStats);

        result.put("amenityCounts", sortByValue(amenityCounts));
        result.put("tagPatternCounts", sortByValue(tagPatternCounts));
        result.put("filterResultCounts", sortByValue(filterResultCounts));
        result.put("topLevelKeyCounts", sortByValue(topLevelKeys));

        result.put("note", "filterOutcome = what OsmPlaceFilter.filter() returns for the extracted tags. "
            + "REJECTED means the reclassifier cannot fix this record. "
            + "A known type (FOOD/ATTRACTION/etc.) means the reclassifier SHOULD have fixed it.");
        result.put("reclassifierNote", "changed = reclassifier successfully modified placeTypeDraft. "
            + "notChanged = reclassifier ran but did not change type (tags known but type unchanged). "
            + "filterRejected = OsmPlaceFilter returned REJECTED for the tags. "
            + "noRawPayload = raw_payload column was null. "
            + "emptyTags = raw_payload had no rawTags/tags key. "
            + "skipped = other reason.");

        return result;
    }

    private String buildTagPattern(Map<String, String> tags, String initialType) {
        List<String> parts = new ArrayList<>();
        if (tags.containsKey("amenity")) parts.add("amenity=" + tags.get("amenity"));
        if (tags.containsKey("tourism")) parts.add("tourism=" + tags.get("tourism"));
        if (tags.containsKey("historic")) parts.add("historic=" + tags.get("historic"));
        if (tags.containsKey("leisure")) parts.add("leisure=" + tags.get("leisure"));
        if (tags.containsKey("natural")) parts.add("natural=" + tags.get("natural"));
        if (tags.containsKey("shop")) parts.add("shop=" + tags.get("shop"));
        if (tags.containsKey("building")) parts.add("building=" + tags.get("building"));
        if (tags.containsKey("office")) parts.add("office=" + tags.get("office"));
        if (tags.containsKey("highway")) parts.add("highway=" + tags.get("highway"));
        if (tags.containsKey("railway")) parts.add("railway=" + tags.get("railway"));
        if (tags.containsKey("cuisine")) parts.add("cuisine=" + tags.get("cuisine"));

        String pattern = parts.isEmpty() ? "NO_RECOGNIZABLE_TAGS" : String.join(", ", parts);
        if (initialType != null && !initialType.isBlank()) {
            pattern += " | initialType=" + initialType;
        }
        return pattern;
    }

    private Map<String, Integer> sortByValue(Map<String, Integer> map) {
        var list = new ArrayList<>(map.entrySet());
        list.sort(Map.Entry.<String, Integer>comparingByValue().reversed());
        Map<String, Integer> sorted = new LinkedHashMap<>();
        for (var entry : list) {
            sorted.put(entry.getKey(), entry.getValue());
        }
        return sorted;
    }
}
