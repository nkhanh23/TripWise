package com.tripwise.place.application.service;

import com.tripwise.place.application.dto.PublishVerificationReport;
import com.tripwise.place.application.dto.StagingPlaceDetailResponse;
import com.tripwise.place.application.dto.StagingPlaceModerationResponse;
import com.tripwise.place.application.service.simulation.AutoModerationRuleEngine;
import com.tripwise.place.application.service.simulation.SimulationCategory;
import com.tripwise.place.application.service.simulation.StagingPlaceTypeReclassifier;
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
public class PublishVerificationService {

    private static final Set<String> KNOWN_TYPES = Set.of("ATTRACTION", "FOOD", "HOTEL", "SERVICE");
    private static final Set<String> SUPPORTED_SOURCES = Set.of("FOURSQUARE_OS_PLACES", "OSM_GEOFABRIK");

    private final PlaceStagingModerationJdbcRepository repository;
    private final StagingPlaceTypeReclassifier reclassifier;
    private final AutoModerationRuleEngine ruleEngine;

    @Transactional(readOnly = true)
    public PublishVerificationReport verify(String province, String city) {
        long startTime = System.currentTimeMillis();
        List<Long> allPending = repository.findPendingStagingIds(province, city);
        log.info("Publish verification: province='{}', city='{}', pending={}", province, city, allPending.size());

        int eligible = 0;
        int publishable = 0;
        int blocked = 0;
        Map<String, Integer> blockBreakdown = new LinkedHashMap<>();
        List<PublishVerificationReport.BlockedRecord> blockedSamples = new ArrayList<>();

        for (Long id : allPending) {
            try {
                StagingPlaceDetailResponse detail = repository.findById(id).orElse(null);
                if (detail == null || detail.getStagingPlace() == null) continue;

                reclassifier.reclassify(detail);
                var result = ruleEngine.evaluate(detail);

                if (result.category() != SimulationCategory.AUTO_APPROVE) continue;
                eligible++;

                var staging = detail.getStagingPlace();
                List<String> reasons = new ArrayList<>();

                if (staging.getCoordinateStatus() != null && staging.getCoordinateStatus().equals("INVALID")) {
                    reasons.add("INVALID_COORDS");
                }
                if (staging.getValidationStatus() != null && staging.getValidationStatus().equals("INVALID")) {
                    reasons.add("INVALID_VALIDATION");
                }

                String placeType = staging.getPlaceTypeDraft();
                if (placeType == null || !KNOWN_TYPES.contains(placeType.toUpperCase())) {
                    reasons.add("INVALID_PLACE_TYPE");
                }

                String source = staging.getSource();
                if (source == null || !SUPPORTED_SOURCES.contains(source)) {
                    reasons.add("UNSUPPORTED_SOURCE");
                }

                if (detail.getCategories() == null || detail.getCategories().isEmpty()) {
                    reasons.add("MISSING_CATEGORY");
                } else {
                    boolean hasPrimary = detail.getCategories().stream()
                            .anyMatch(c -> Boolean.TRUE.equals(c.getIsPrimary()));
                    if (!hasPrimary) reasons.add("MISSING_PRIMARY_CATEGORY");
                }

                if (staging.getLatitude() == null || staging.getLongitude() == null) {
                    reasons.add("MISSING_COORDINATES");
                } else if (staging.getLatitude() < -90 || staging.getLatitude() > 90
                        || staging.getLongitude() < -180 || staging.getLongitude() > 180) {
                    reasons.add("COORDINATES_OUT_OF_BOUNDS");
                }

                if (detail.getExistingPublicDuplicate() != null) {
                    reasons.add("EXISTING_PUBLIC_DUPLICATE");
                }

                if (staging.getName() == null || staging.getName().strip().length() < 3) {
                    reasons.add("INVALID_NAME");
                }

                if (reasons.isEmpty()) {
                    publishable++;
                } else {
                    blocked++;
                    String primaryReason = reasons.get(0);
                    blockBreakdown.merge("Blocked because " + primaryReason.toLowerCase().replace('_', ' '), 1, Integer::sum);
                    if (blockedSamples.size() < 50) {
                        blockedSamples.add(new PublishVerificationReport.BlockedRecord(
                            id, staging.getName(), placeType,
                            primaryReason, String.join(", ", reasons)
                        ));
                    }
                }

            } catch (Exception e) {
                blocked++;
                blockBreakdown.merge("Blocked because unexpected exception", 1, Integer::sum);
                if (blockedSamples.size() < 50) {
                    blockedSamples.add(new PublishVerificationReport.BlockedRecord(
                        id, null, null, "EXCEPTION", e.getMessage() != null ? e.getMessage().substring(0, Math.min(100, e.getMessage().length())) : "unknown"
                    ));
                }
            }
        }

        double successRate = eligible > 0 ? (publishable * 100.0 / eligible) : 0.0;
        long duration = System.currentTimeMillis() - startTime;

        List<String> topBlockers = blockBreakdown.entrySet().stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                .limit(5)
                .map(e -> e.getKey() + ": " + e.getValue())
                .toList();

        log.info("Verification complete: eligible={}, publishable={}, blocked={}, rate={:.1f}%, {}ms",
                eligible, publishable, blocked, successRate, duration);

        return new PublishVerificationReport(
            province, city, allPending.size(), eligible, publishable, blocked,
            Math.round(successRate * 10.0) / 10.0, duration,
            blockBreakdown, blockedSamples, topBlockers
        );
    }
}