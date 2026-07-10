package com.tripwise.place.application.service.simulation;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tripwise.place.application.dto.PlaceImportRecord;
import com.tripwise.place.application.dto.StagingPlaceDetailResponse;
import com.tripwise.place.application.dto.StagingPlaceModerationResponse;
import com.tripwise.place.application.service.PlaceModerationEvaluator;
import com.tripwise.place.application.service.PlaceModerationPreview;
import com.tripwise.place.domain.model.VerificationStatus;
import com.tripwise.place.infrastructure.persistence.PlaceStagingModerationJdbcRepository;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Component
public class AutoApproveEligibleRule implements AutoModerationRule {

    private final PlaceModerationEvaluator placeModerationEvaluator;
    private final PlaceStagingModerationJdbcRepository repository;
    private final ObjectMapper objectMapper;

    public AutoApproveEligibleRule(
            PlaceModerationEvaluator placeModerationEvaluator,
            PlaceStagingModerationJdbcRepository repository,
            ObjectMapper objectMapper
    ) {
        this.placeModerationEvaluator = placeModerationEvaluator;
        this.repository = repository;
        this.objectMapper = objectMapper;
    }

    @Override
    public boolean evaluate(StagingPlaceDetailResponse detail) {
        StagingPlaceModerationResponse staging = detail.getStagingPlace();
        if (staging == null) return false;

        if ("INVALID".equals(staging.getCoordinateStatus()) || "INVALID".equals(staging.getValidationStatus())) {
            return false;
        }

        if (detail.getCategories() == null || detail.getCategories().isEmpty()) {
            return false;
        }

        if (detail.getExistingPublicDuplicate() != null) {
            return false;
        }

        if (detail.getCandidates() != null) {
            boolean hasHighOrMedDup = detail.getCandidates().stream()
                    .anyMatch(c -> "HIGH".equals(c.getMatchConfidence()) || "MEDIUM".equals(c.getMatchConfidence()));
            if (hasHighOrMedDup) {
                return false;
            }
        }

        try {
            String payloadJson = staging.getRawPayload();
            PlaceImportRecord importRecord = toImportRecord(detail, payloadJson);
            PlaceModerationPreview preview = placeModerationEvaluator.evaluate(importRecord, staging.getSource());

            int threshold = "FOOD".equalsIgnoreCase(staging.getPlaceTypeDraft()) ? 75 : 80;
            if (preview.qualityScore() < threshold) {
                return false;
            }

            return preview.verificationStatus() == VerificationStatus.AUTO_APPROVED
                    || preview.verificationStatus() == VerificationStatus.VERIFIED;

        } catch (Exception e) {
            return false;
        }
    }

    @Override
    public SimulationCategory getCategory() {
        return SimulationCategory.AUTO_APPROVE;
    }

    @Override
    public String getSubCategory(StagingPlaceDetailResponse detail) {
        if (detail.getStagingPlace() != null && detail.getStagingPlace().getPlaceTypeDraft() != null) {
            return detail.getStagingPlace().getPlaceTypeDraft().toUpperCase();
        }
        return "UNKNOWN";
    }

    private PlaceImportRecord toImportRecord(StagingPlaceDetailResponse detail, String payloadJson) {
        Map<String, Object> payloadMap = null;
        try {
            if (payloadJson != null && !payloadJson.isBlank()) {
                payloadMap = objectMapper.readValue(payloadJson, new TypeReference<Map<String, Object>>() {});
            }
        } catch (Exception e) {
        }
        if (payloadMap == null) {
            payloadMap = Map.of();
        }

        Map<String, String> rawTags = extractFoursquareOsmTags(payloadMap);

        StagingPlaceModerationResponse staging = detail.getStagingPlace();
        return new PlaceImportRecord(
                staging.getSourcePlaceId(),
                staging.getName(),
                staging.getRegion(),
                staging.getLocality(),
                (String) payloadMap.get("district"),
                (String) payloadMap.get("ward"),
                staging.getAddress(),
                rawTags.isEmpty() ? deriveCategorySlug(staging.getPlaceTypeDraft()) : null,
                staging.getLatitude(),
                staging.getLongitude(),
                (String) payloadMap.get("description"),
                null,
                (Integer) payloadMap.get("durationMinutes"),
                (Boolean) payloadMap.get("indoor"),
                (Boolean) payloadMap.get("active"),
                (String) payloadMap.get("priceLevel"),
                staging.getValidationStatus(),
                Set.of(),
                rawTags
        );
    }

    private String deriveCategorySlug(String placeTypeDraft) {
        if (placeTypeDraft == null) {
            return null;
        }
        return switch (placeTypeDraft.toUpperCase()) {
            case "ATTRACTION" -> "entertainment";
            case "FOOD" -> "food";
            case "HOTEL" -> "hotel";
            case "SERVICE" -> "service";
            default -> null;
        };
    }

    private Map<String, String> extractFoursquareOsmTags(Map<String, Object> payloadMap) {
        List<String> labels = null;
        try {
            Object labelsObj = payloadMap.get("fsq_category_labels");
            if (labelsObj instanceof List<?> list) {
                labels = new ArrayList<>();
                for (Object item : list) {
                    if (item != null) labels.add(item.toString().toLowerCase(Locale.ROOT));
                }
            }
        } catch (Exception e) {
        }
        if (labels == null || labels.isEmpty()) return Map.of();

        Map<String, String> tags = new LinkedHashMap<>();
        String joined = String.join(" ", labels);

        if (joined.contains("museum")) tags.put("tourism", "museum");
        else if (joined.contains("aquarium")) tags.put("tourism", "aquarium");
        else if (joined.contains("zoo")) tags.put("tourism", "zoo");
        else if (joined.contains("theme park") || joined.contains("amusement")) tags.put("tourism", "theme_park");
        else if (joined.contains("gallery") || joined.contains("art")) tags.put("tourism", "gallery");
        else if (joined.contains("viewpoint") || joined.contains("scenic")) tags.put("tourism", "viewpoint");
        else if (joined.contains("monument")) tags.put("historic", "monument");
        else if (joined.contains("castle") || joined.contains("fort")) tags.put("historic", "castle");
        else if (joined.contains("ruins") || joined.contains("archaeological")) tags.put("historic", "archaeological_site");
        else if (joined.contains("temple") || joined.contains("pagoda") || joined.contains("spiritual")
                || joined.contains("church") || joined.contains("cathedral") || joined.contains("mosque")
                || joined.contains("shrine")) {
            tags.put("historic", "temple");
            tags.put("amenity", "place_of_worship");
        } else if (joined.contains("beach")) tags.put("natural", "beach");
        else if (joined.contains("waterfall")) tags.put("natural", "waterfall");
        else if (joined.contains("peak") || joined.contains("mountain")) tags.put("natural", "peak");
        else if (joined.contains("cave")) tags.put("natural", "cave_entrance");
        else if (joined.contains("bay") || joined.contains("lake") || joined.contains("river")) tags.put("natural", "bay");
        else if (joined.contains("park") || joined.contains("garden") || joined.contains("nature"))
            tags.put("leisure", "park");
        else if (joined.contains("theatre") || joined.contains("theater"))
            tags.put("amenity", "theatre");
        else if (joined.contains("landmark") || joined.contains("outdoors"))
            tags.put("tourism", "attraction");
        else
            tags.put("tourism", "attraction");

        if (joined.contains("restaurant") || joined.contains("dining") || joined.contains("food"))
            tags.putIfAbsent("amenity", "restaurant");
        if (joined.contains("cafe") || joined.contains("coffee") || joined.contains("tea") || joined.contains("bakery"))
            tags.putIfAbsent("amenity", "cafe");
        if (joined.contains("bar") || joined.contains("pub"))
            tags.putIfAbsent("amenity", "bar");

        if (joined.contains("hotel") || joined.contains("resort") || joined.contains("motel")
                || joined.contains("hostel") || joined.contains("lodging"))
            tags.putIfAbsent("tourism", "hotel");

        return tags;
    }
}