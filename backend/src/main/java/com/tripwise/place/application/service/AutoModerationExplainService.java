package com.tripwise.place.application.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tripwise.place.application.dto.ExplainExclusiveReport;
import com.tripwise.place.application.dto.ExplainReport;
import com.tripwise.place.application.dto.ExplainReport.Recommendation;
import com.tripwise.place.application.dto.PlaceImportRecord;
import com.tripwise.place.application.dto.StagingPlaceDetailResponse;
import com.tripwise.place.application.service.simulation.AutoModerationRuleEngine;
import com.tripwise.place.application.service.simulation.SimulationCategory;
import com.tripwise.place.application.service.simulation.StagingPlaceTypeReclassifier;
import com.tripwise.place.infrastructure.persistence.PlaceStagingModerationJdbcRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AutoModerationExplainService {

    private static final Set<String> KNOWN_TYPES = Set.of("ATTRACTION", "FOOD", "HOTEL", "SERVICE");

    private final PlaceStagingModerationJdbcRepository repository;
    private final StagingPlaceTypeReclassifier reclassifier;
    private final AutoModerationRuleEngine ruleEngine;
    private final PlaceModerationEvaluator placeModerationEvaluator;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public ExplainReport explain(String province, String city) {
        List<Long> ids = repository.findAllStagingIdsByLocation(province, city);
        log.info("Explain for province='{}', city='{}': {} total records", province, city, ids.size());

        // Per-record failure accumulators
        List<RecordFailures> allFailures = new ArrayList<>();
        // Aggregate counters — LinkedHashMap for stable order
        Map<String, Integer> failureBreakdown = new LinkedHashMap<>();
        // Combination pairs
        Map<String, Integer> combinationBreakdown = new LinkedHashMap<>();
        // Category distribution
        Map<String, Integer> categoryBreakdown = new LinkedHashMap<>();
        // Place type distribution
        Map<String, Integer> placeTypeBreakdown = new LinkedHashMap<>();

        for (Long id : ids) {
            try {
                StagingPlaceDetailResponse detail = repository.findById(id).orElse(null);
                if (detail == null) continue;

                // Must run reclassifier + engine to get the actual subCategory (duplicate LOW/MEDIUM etc.)
                reclassifier.reclassify(detail);
                AutoModerationRuleEngine.EvaluationResult result = ruleEngine.evaluate(detail);

                String placeType = detail.getStagingPlace() != null && detail.getStagingPlace().getPlaceTypeDraft() != null
                        ? detail.getStagingPlace().getPlaceTypeDraft().toUpperCase() : "UNKNOWN";
                String primaryCategory = extractPrimaryCategory(detail);

                // If record got AUTO_REJECT or AUTO_DUPLICATE or AUTO_APPROVE, it's NOT "needs admin review"
                if (result.category() != SimulationCategory.NEEDS_ADMIN_REVIEW) {
                    continue;
                }

                // Now dig into WHY this record failed AutoApproveEligibleRule
                RecordFailures failures = diagnoseFailures(detail);
                allFailures.add(failures);

                // Accumulate failure breakdown
                for (String failure : failures.failures) {
                    failureBreakdown.merge(failure, 1, Integer::sum);
                }

                // Accumulate combination breakdown (pairs)
                List<String> sorted = failures.failures.stream().sorted().toList();
                if (sorted.size() >= 2) {
                    for (int i = 0; i < sorted.size(); i++) {
                        for (int j = i + 1; j < sorted.size(); j++) {
                            String pair = sorted.get(i) + " + " + sorted.get(j);
                            combinationBreakdown.merge(pair, 1, Integer::sum);
                        }
                    }
                }

                // Accumulate category breakdown
                if (primaryCategory != null) {
                    categoryBreakdown.merge(primaryCategory, 1, Integer::sum);
                }

                // Accumulate place type breakdown
                if (placeType != null && KNOWN_TYPES.contains(placeType)) {
                    placeTypeBreakdown.merge(placeType, 1, Integer::sum);
                }
            } catch (Exception e) {
                log.warn("Explain failed for staging ID={}: {}", id, e.getMessage());
                failureBreakdown.merge("Evaluation error", 1, Integer::sum);
            }
        }

        // Generate recommendations sorted by expected reduction
        List<Recommendation> recommendations = buildRecommendations(failureBreakdown);

        return new ExplainReport(
            province,
            city,
            ids.size(),
            allFailures.size(),
            sortDescending(failureBreakdown),
            sortDescending(combinationBreakdown),
            sortDescending(categoryBreakdown),
            sortDescending(placeTypeBreakdown),
            recommendations
        );
    }

    /**
     * Diagnose ALL failure reasons for a record that ended in NEEDS_ADMIN_REVIEW.
     * Checks each condition independently so we collect every issue, not just the first.
     */
    private RecordFailures diagnoseFailures(StagingPlaceDetailResponse detail) {
        List<String> failures = new ArrayList<>();
        var staging = detail.getStagingPlace();

        if (staging == null) {
            failures.add("Staging record missing");
            return new RecordFailures(staging != null ? staging.getId() : -1, null, null, failures);
        }

        Long id = staging.getId();
        String placeType = staging.getPlaceTypeDraft();
        String primaryCategory = extractPrimaryCategory(detail);

        // 1. Check coordinate status
        String coordStatus = staging.getCoordinateStatus();
        if ("INVALID".equals(coordStatus)) {
            failures.add("Invalid coordinates");
        }

        // 2. Check validation status
        String validationStatus = staging.getValidationStatus();
        if ("INVALID".equals(validationStatus)) {
            failures.add("Invalid validation status");
        }

        // 3. Check categories presence
        boolean hasCategories = detail.getCategories() != null && !detail.getCategories().isEmpty();
        if (!hasCategories) {
            failures.add("Missing categories");
        }

        // 4. Check primary category
        if (hasCategories) {
            boolean hasPrimary = detail.getCategories().stream()
                    .anyMatch(c -> Boolean.TRUE.equals(c.getIsPrimary()));
            if (!hasPrimary) {
                failures.add("Missing primary category");
            }
        }

        // 5. Check exact duplicate
        if (detail.getExistingPublicDuplicate() != null) {
            failures.add("Existing public duplicate");
        }

        // 6. Check duplicate candidates
        if (detail.getCandidates() != null && !detail.getCandidates().isEmpty()) {
            boolean hasHigh = detail.getCandidates().stream()
                    .anyMatch(c -> "HIGH".equals(c.getMatchConfidence()));
            boolean hasMedium = detail.getCandidates().stream()
                    .anyMatch(c -> "MEDIUM".equals(c.getMatchConfidence()));
            boolean hasLow = detail.getCandidates().stream()
                    .anyMatch(c -> "LOW".equals(c.getMatchConfidence()));

            if (hasHigh) {
                failures.add("Duplicate HIGH");
            }
            if (hasMedium && !hasHigh) {
                failures.add("Duplicate MEDIUM");
            }
            if (hasLow && !hasMedium && !hasHigh) {
                failures.add("Duplicate LOW");
            }
        }

        // 7. Check place type
        if (placeType == null || placeType.isBlank() || !KNOWN_TYPES.contains(placeType.toUpperCase())) {
            failures.add("Ambiguous place type");
        }

        // 8. Check quality score and verification status via PlaceModerationEvaluator
        try {
            String payloadJson = staging.getRawPayload();
            PlaceImportRecord importRecord = toImportRecord(detail, payloadJson);
            PlaceModerationPreview preview = placeModerationEvaluator.evaluate(importRecord, staging.getSource());

            // Verification status check
            var verificationStatus = preview.verificationStatus();
            boolean isAutoApprovedOrVerified = verificationStatus == com.tripwise.place.domain.model.VerificationStatus.AUTO_APPROVED
                    || verificationStatus == com.tripwise.place.domain.model.VerificationStatus.VERIFIED;
            if (!isAutoApprovedOrVerified) {
                String statusLabel = verificationStatus != null ? verificationStatus.name() : "null";
                failures.add("Verification status not VERIFIED/AUTO_APPROVED (" + statusLabel + ")");
            }

            // Quality score check
            int threshold = "FOOD".equalsIgnoreCase(staging.getPlaceTypeDraft()) ? 75 : 80;
            if (preview.qualityScore() < threshold) {
                failures.add("Quality score below threshold (" + preview.qualityScore() + " < " + threshold + ")");
            }
        } catch (Exception e) {
            failures.add("Evaluation error: " + e.getMessage());
        }

        // 9. If we found nothing specific — unknown reason
        if (failures.isEmpty()) {
            failures.add("Unknown");
        }

        return new RecordFailures(id, placeType, primaryCategory, failures);
    }

    private PlaceImportRecord toImportRecord(StagingPlaceDetailResponse detail, String payloadJson) {
        var staging = detail.getStagingPlace();

        Map<String, Object> payloadMap = null;
        try {
            if (payloadJson != null && !payloadJson.isBlank() && !payloadJson.equals("null")) {
                payloadMap = objectMapper.readValue(payloadJson, new TypeReference<Map<String, Object>>() {});
            }
        } catch (Exception e) {
        }
        if (payloadMap == null) {
            payloadMap = Map.of();
        }

        Map<String, String> rawTags = extractFoursquareOsmTags(payloadMap);

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
            null, null, null, null,
            staging.getValidationStatus(),
            Set.of(),
            rawTags
        );
    }

    private Map<String, String> extractFoursquareOsmTags(Map<String, Object> payloadMap) {
        java.util.List<String> labels = null;
        try {
            Object labelsObj = payloadMap.get("fsq_category_labels");
            if (labelsObj instanceof java.util.List<?> list) {
                labels = new java.util.ArrayList<>();
                for (Object item : list) {
                    if (item != null) labels.add(item.toString().toLowerCase(java.util.Locale.ROOT));
                }
            }
        } catch (Exception e) {
        }
        if (labels == null || labels.isEmpty()) return Map.of();

        Map<String, String> tags = new java.util.LinkedHashMap<>();
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
    private String extractPrimaryCategory(StagingPlaceDetailResponse detail) {
        if (detail.getCategories() == null || detail.getCategories().isEmpty()) {
            return "UNCATEGORIZED";
        }
        return detail.getCategories().stream()
                .filter(c -> Boolean.TRUE.equals(c.getIsPrimary()))
                .findFirst()
                .map(StagingPlaceDetailResponse.CategoryResponse::getCategoryLabel)
                .orElse(detail.getCategories().getFirst().getCategoryLabel());
    }

    private List<Recommendation> buildRecommendations(Map<String, Integer> failureBreakdown) {
        List<Recommendation> recs = new ArrayList<>();

        int verificationIssues = failureBreakdown.getOrDefault("Verification status not VERIFIED/AUTO_APPROVED (PENDING)", 0)
                + failureBreakdown.getOrDefault("Verification status not VERIFIED/AUTO_APPROVED (REJECTED)", 0)
                + failureBreakdown.entrySet().stream()
                    .filter(e -> e.getKey().startsWith("Verification status"))
                    .mapToInt(Map.Entry::getValue)
                    .sum();

        if (verificationIssues > 0) {
            recs.add(new Recommendation(
                "Improve verification pipeline",
                verificationIssues + " records have non-approved verification status. Update PlaceModerationEvaluator to promote eligible records to AUTO_APPROVED status.",
                verificationIssues
            ));
        }

        int qualityIssues = failureBreakdown.entrySet().stream()
                .filter(e -> e.getKey().startsWith("Quality score"))
                .mapToInt(Map.Entry::getValue)
                .sum();

        if (qualityIssues > 0) {
            recs.add(new Recommendation(
                "Improve quality score calculation",
                qualityIssues + " records have quality score below threshold. Review PlaceModerationEvaluator thresholds or improve data completeness scoring.",
                qualityIssues
            ));
        }

        int missingCategories = failureBreakdown.getOrDefault("Missing categories", 0);
        if (missingCategories > 0) {
            recs.add(new Recommendation(
                "Improve category mapping",
                missingCategories + " records have no category mapping. Extend OsmPlaceFilter or Foursquare label mapping to handle edge cases.",
                missingCategories
            ));
        }

        int missingPrimary = failureBreakdown.getOrDefault("Missing primary category", 0);
        if (missingPrimary > 0) {
            recs.add(new Recommendation(
                "Assign primary category during import",
                missingPrimary + " records have categories but no primary marker. Update import pipeline to designate a primary category.",
                missingPrimary
            ));
        }

        int duplicateLow = failureBreakdown.getOrDefault("Duplicate LOW", 0);
        if (duplicateLow > 0) {
            recs.add(new Recommendation(
                "Review LOW confidence duplicate rules",
                duplicateLow + " records flagged with LOW confidence duplicates. Consider auto-approving LOW duplicates with strong quality scores.",
                duplicateLow
            ));
        }

        int duplicateMedium = failureBreakdown.getOrDefault("Duplicate MEDIUM", 0);
        if (duplicateMedium > 0) {
            recs.add(new Recommendation(
                "Review MEDIUM confidence duplicate rules",
                duplicateMedium + " records flagged with MEDIUM confidence duplicates. Consider auto-approving if quality score > 85 and MEDIUM dups are only name-based.",
                duplicateMedium
            ));
        }

        int coordIssues = failureBreakdown.getOrDefault("Invalid coordinates", 0);
        if (coordIssues > 0) {
            recs.add(new Recommendation(
                "Fix coordinate validation",
                coordIssues + " records have invalid coordinates. Review coordinate pipeline for missing or out-of-bounds data.",
                coordIssues
            ));
        }

        recs.sort(Comparator.comparingInt(Recommendation::expectedReduction).reversed());
        return recs;
    }

    private Map<String, Integer> sortDescending(Map<String, Integer> map) {
        return map.entrySet().stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                .collect(Collectors.toMap(
                    Map.Entry::getKey,
                    Map.Entry::getValue,
                    (a, b) -> a,
                    LinkedHashMap::new
                ));
    }

    // ========== EXCLUSIVE BUCKET ANALYSIS ==========

    public ExplainExclusiveReport explainExclusive(String province, String city) {
        List<Long> ids = repository.findAllStagingIdsByLocation(province, city);
        log.info("ExplainExclusive for province='{}', city='{}': {} total records", province, city, ids.size());

        // Group records by their exact failure set key
        Map<String, List<RecordFailures>> bucketMap = new LinkedHashMap<>();
        Map<String, Long> bucketRecordCount = new LinkedHashMap<>();

        for (Long id : ids) {
            try {
                StagingPlaceDetailResponse detail = repository.findById(id).orElse(null);
                if (detail == null) continue;

                reclassifier.reclassify(detail);
                AutoModerationRuleEngine.EvaluationResult result = ruleEngine.evaluate(detail);
                if (result.category() != SimulationCategory.NEEDS_ADMIN_REVIEW) continue;

                RecordFailures rf = diagnoseFailures(detail);
                String key = String.join(" + ", rf.failures().stream().sorted().toList());
                bucketMap.computeIfAbsent(key, k -> new ArrayList<>()).add(rf);
                bucketRecordCount.merge(key, 1L, Long::sum);
            } catch (Exception e) {
                log.warn("ExplainExclusive failed for staging ID={}: {}", id, e.getMessage());
                String key = "Evaluation error: " + e.getMessage();
                bucketMap.computeIfAbsent(key, k -> new ArrayList<>()).add(new RecordFailures(id, null, null, List.of(key)));
                bucketRecordCount.merge(key, 1L, Long::sum);
            }
        }

        int totalReview = ids.size();
        List<ExplainExclusiveReport.ExclusiveBucket> buckets = new ArrayList<>();

        for (Map.Entry<String, List<RecordFailures>> entry : bucketMap.entrySet()) {
            String key = entry.getKey();
            List<RecordFailures> records = entry.getValue();
            int count = records.size();
            double pct = totalReview > 0 ? (count * 100.0 / totalReview) : 0.0;

            // Sample records (up to 5)
            List<Long> samples = records.stream()
                    .map(RecordFailures::stagingId)
                    .limit(5)
                    .toList();

            // Derive safety/difficulty from the failure set
            boolean isSingleFailure = !key.contains(" + ");
            boolean hasInvalidCoord = key.contains("Invalid coordinates");
            boolean hasValidationIssue = key.contains("Invalid validation status");
            boolean hasMissingCategories = key.contains("Missing categories");
            boolean hasDuplicateHigh = key.contains("Duplicate HIGH");
            boolean hasDuplicateMedium = key.contains("Duplicate MEDIUM");
            boolean hasDuplicateLow = key.contains("Duplicate LOW");
            boolean hasQualityIssue = key.startsWith("Quality score");
            boolean hasVerificationIssue = key.startsWith("Verification status");
            boolean hasExistingDup = key.contains("Existing public duplicate");
            boolean hasAmbiguousType = key.contains("Ambiguous place type");
            boolean hasMissingPrimary = key.contains("Missing primary category");
            boolean hasEvalError = key.contains("Evaluation error");

            // Safety assessment (★★★★★ = safest)
            String safetyLabel;
            String safetyStars;
            String difficultyLabel;
            String difficultyStars;

            if (hasEvalError) {
                safetyLabel = "Needs investigation — evaluation error";
                safetyStars = "☆☆☆☆☆";
                difficultyLabel = "Hard — debug the evaluation pipeline";
                difficultyStars = "★★★☆☆";
            } else if (hasInvalidCoord || hasValidationIssue) {
                safetyLabel = "Unsafe — data quality issue";
                safetyStars = "★☆☆☆☆";
                difficultyLabel = "Hard — fix upstream validation";
                difficultyStars = "★★★★☆";
            } else if (hasDuplicateHigh) {
                safetyLabel = "Moderate — HIGH confidence duplicate";
                safetyStars = "★★☆☆☆";
                difficultyLabel = "Medium — needs duplicate research";
                difficultyStars = "★★★☆☆";
            } else if (hasDuplicateMedium) {
                safetyLabel = "Moderate — MEDIUM confidence duplicate";
                safetyStars = "★★☆☆☆";
                difficultyLabel = "Medium — needs duplicate research";
                difficultyStars = "★★★☆☆";
            } else if (hasExistingDup) {
                safetyLabel = "Moderate — existing public duplicate";
                safetyStars = "★★☆☆☆";
                difficultyLabel = "Low — already identified as duplicate";
                difficultyStars = "★★☆☆☆";
            } else if (hasMissingCategories) {
                safetyLabel = "Needs investigation — missing category";
                safetyStars = "★★☆☆☆";
                difficultyLabel = "Medium — fix category mapping";
                difficultyStars = "★★★☆☆";
            } else if (hasAmbiguousType) {
                safetyLabel = "Needs investigation — ambiguous type";
                safetyStars = "★★☆☆☆";
                difficultyLabel = "Medium — fix place type mapping";
                difficultyStars = "★★★☆☆";
            } else if (isSingleFailure && hasVerificationIssue) {
                safetyLabel = "Safe candidate — only verification status";
                safetyStars = "★★★★★";
                difficultyLabel = "Easy — fix verification pipeline in PlaceModerationEvaluator";
                difficultyStars = "★★★★★";
            } else if (isSingleFailure && hasQualityIssue) {
                safetyLabel = "Needs investigation — only quality score";
                safetyStars = "★★★☆☆";
                difficultyLabel = "Medium — review quality thresholds or data completeness";
                difficultyStars = "★★★☆☆";
            } else if (isSingleFailure && hasDuplicateLow) {
                safetyLabel = "Safe candidate — only LOW duplicate";
                safetyStars = "★★★★☆";
                difficultyLabel = "Medium — needs duplicate config update";
                difficultyStars = "★★★☆☆";
            } else if (isSingleFailure && hasMissingPrimary) {
                safetyLabel = "Safe candidate — only missing primary category";
                safetyStars = "★★★★☆";
                difficultyLabel = "Easy — auto-assign first category as primary";
                difficultyStars = "★★★★★";
            } else if (isSingleFailure && hasVerificationIssue && hasQualityIssue) {
                // This can't happen due to "isSingleFailure" check — just in case
                safetyLabel = "Safe candidate — verification + quality";
                safetyStars = "★★★☆☆";
                difficultyLabel = "Easy — fix verification pipeline";
                difficultyStars = "★★★★☆";
            } else {
                // Multiple failures
                int failureCount = key.split(" \\+ ").length;
                if (failureCount == 2 && hasVerificationIssue && hasQualityIssue) {
                    safetyLabel = "Moderate — verification + quality";
                    safetyStars = "★★★☆☆";
                    difficultyLabel = "Easy — fix verification pipeline; quality needs review";
                    difficultyStars = "★★★★☆";
                } else if (failureCount == 2 && hasVerificationIssue && hasMissingCategories) {
                    safetyLabel = "Needs investigation — verification + missing category";
                    safetyStars = "★★☆☆☆";
                    difficultyLabel = "Medium — two separate fixes needed";
                    difficultyStars = "★★★☆☆";
                } else if (failureCount == 2 && hasQualityIssue && hasDuplicateLow) {
                    safetyLabel = "Needs investigation — quality + LOW duplicate";
                    safetyStars = "★★☆☆☆";
                    difficultyLabel = "Medium — quality review + duplicate config";
                    difficultyStars = "★★★☆☆";
                } else {
                    safetyLabel = "Unsafe — " + failureCount + " combined failures";
                    safetyStars = "★☆☆☆☆";
                    difficultyLabel = "Hard — requires multiple fixes";
                    difficultyStars = "★★☆☆☆";
                }
            }

            buckets.add(new ExplainExclusiveReport.ExclusiveBucket(
                key, count, Math.round(pct * 10.0) / 10.0, samples,
                safetyLabel, safetyStars, difficultyLabel, difficultyStars,
                (int) (count * starsToScore(safetyStars))
            ));
        }

        // Sort by ROI: most impactful first (count * safety score)
        buckets.sort((a, b) -> Integer.compare(b.roiScore(), a.roiScore()));

        List<String> recommendations = buildExclusiveRecommendations(buckets);

        return new ExplainExclusiveReport(province, city, totalReview, totalReview, buckets, recommendations);
    }

    private int starsToScore(String stars) {
        return switch (stars) {
            case "★★★★★" -> 5;
            case "★★★★☆" -> 4;
            case "★★★☆☆" -> 3;
            case "★★☆☆☆" -> 2;
            case "★☆☆☆☆" -> 1;
            default -> 0;
        };
    }

    private List<String> buildExclusiveRecommendations(List<ExplainExclusiveReport.ExclusiveBucket> buckets) {
        List<String> recs = new ArrayList<>();

        // Rank by ROI: single-failure + high safety first
        for (ExplainExclusiveReport.ExclusiveBucket b : buckets) {
            String prefix = b.name().contains(" + ") ? "Fix multi-failure" : "Automate single failure";
            recs.add(String.format(
                "%s: \"%s\" — %d records (%.1f%%) — %s — %s — ROI priority %d",
                prefix, b.name(), b.recordCount(), b.percentage(),
                b.safetyLabel(), b.difficultyLabel(), b.roiScore()
            ));
        }

        return recs;
    }

    private record RecordFailures(Long stagingId, String placeType, String category, List<String> failures) {}

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
}
