package com.tripwise.place.application.service;

import com.tripwise.place.application.dto.RuleAuditResponse;
import com.tripwise.place.application.dto.StagingPlaceDetailResponse;
import com.tripwise.place.application.service.simulation.AutoModerationRuleEngine;
import com.tripwise.place.application.service.simulation.SimulationCategory;
import com.tripwise.place.infrastructure.persistence.PlaceStagingModerationJdbcRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class RuleAuditService {

    private static final Set<String> KNOWN_PLACE_TYPES = Set.of("FOOD", "HOTEL", "ATTRACTION", "SERVICE");

    private final PlaceStagingModerationJdbcRepository repository;
    private final AutoModerationRuleEngine ruleEngine;

    @Transactional(readOnly = true)
    public RuleAuditResponse runAudit(String province, String city) {
        log.info("Running rule audit for province='{}', city='{}'", province, city);
        List<Long> ids = repository.findPendingStagingIds(province, city);
        log.info("Found {} pending staging records for audit.", ids.size());

        int totalStaging = ids.size();
        int autoApproveCount = 0;
        int autoDuplicateCount = 0;
        int autoRejectCount = 0;
        int adminReviewCount = 0;

        Map<String, Integer> ruleCounts = new LinkedHashMap<>();
        Map<String, Integer> placeTypeCounts = new LinkedHashMap<>();
        Map<String, Integer> categoryCounts = new LinkedHashMap<>();
        Map<String, Integer> sourceCounts = new LinkedHashMap<>();
        Map<String, Map<String, Integer>> ruleCategoryMatrix = new LinkedHashMap<>();

        List<AuditRecord> auditRecords = new ArrayList<>();

        for (Long id : ids) {
            try {
                StagingPlaceDetailResponse detail = repository.findById(id).orElse(null);
                if (detail == null) continue;

                AutoModerationRuleEngine.EvaluationResult result = ruleEngine.evaluate(detail);

                String ruleName = result.subCategory() != null ? result.subCategory() : "Unknown";
                String categoryLabel = extractPrimaryCategory(detail);
                String placeTypeDraft = detail.getStagingPlace() != null && detail.getStagingPlace().getPlaceTypeDraft() != null
                        ? detail.getStagingPlace().getPlaceTypeDraft().toUpperCase() : "UNKNOWN";
                String source = detail.getStagingPlace() != null && detail.getStagingPlace().getSource() != null
                        ? detail.getStagingPlace().getSource() : "UNKNOWN";

                switch (result.category()) {
                    case AUTO_APPROVE -> autoApproveCount++;
                    case AUTO_DUPLICATE -> autoDuplicateCount++;
                    case AUTO_REJECT -> autoRejectCount++;
                    case NEEDS_ADMIN_REVIEW -> {
                        adminReviewCount++;
                        ruleCounts.merge(ruleName, 1, Integer::sum);
                        placeTypeCounts.merge(placeTypeDraft, 1, Integer::sum);
                        categoryCounts.merge(categoryLabel, 1, Integer::sum);
                        sourceCounts.merge(source, 1, Integer::sum);
                        ruleCategoryMatrix
                                .computeIfAbsent(ruleName, k -> new LinkedHashMap<>())
                                .merge(categoryLabel, 1, Integer::sum);

                        boolean hasValidCoords = detail.getStagingPlace() != null
                                && !"INVALID".equals(detail.getStagingPlace().getCoordinateStatus());
                        boolean hasKnownPlaceType = KNOWN_PLACE_TYPES.contains(placeTypeDraft);
                        boolean hasCategory = detail.getCategories() != null && !detail.getCategories().isEmpty();
                        boolean hasHighMedDupes = hasHighOrMediumConfidenceDupes(detail);
                        boolean hasExactDup = detail.getExistingPublicDuplicate() != null;

                        auditRecords.add(new AuditRecord(
                                categoryLabel, hasValidCoords, hasKnownPlaceType,
                                hasCategory, hasHighMedDupes, hasExactDup, ruleName
                        ));
                    }
                }
            } catch (Exception e) {
                log.error("Failed to evaluate staging record ID={}: {}", id, e.getMessage());
                adminReviewCount++;
                ruleCounts.merge("Evaluation error", 1, Integer::sum);
            }
        }

        List<RuleAuditResponse.RuleBreakdown> ruleBreakdown = ruleCounts.entrySet().stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                .map(e -> new RuleAuditResponse.RuleBreakdown(e.getKey(), e.getValue()))
                .toList();

        List<RuleAuditResponse.PlaceTypeDraftBreakdown> ptBreakdown = placeTypeCounts.entrySet().stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                .map(e -> new RuleAuditResponse.PlaceTypeDraftBreakdown(e.getKey(), e.getValue()))
                .toList();

        List<RuleAuditResponse.CategoryBreakdown> catBreakdown = categoryCounts.entrySet().stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                .limit(30)
                .map(e -> new RuleAuditResponse.CategoryBreakdown(e.getKey(), e.getValue()))
                .toList();

        List<RuleAuditResponse.SourceBreakdown> srcBreakdown = sourceCounts.entrySet().stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                .map(e -> new RuleAuditResponse.SourceBreakdown(e.getKey(), e.getValue()))
                .toList();

        List<RuleAuditResponse.RuleCategoryMatrixItem> matrix = ruleCategoryMatrix.entrySet().stream()
                .map(entry -> {
                    List<RuleAuditResponse.CategoryBreakdown> cats = entry.getValue().entrySet().stream()
                            .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                            .limit(30)
                            .map(e -> new RuleAuditResponse.CategoryBreakdown(e.getKey(), e.getValue()))
                            .toList();
                    return new RuleAuditResponse.RuleCategoryMatrixItem(entry.getKey(), cats);
                })
                .toList();

        List<RuleAuditResponse.Recommendation> recommendations = buildRecommendations(auditRecords, categoryCounts);

        RuleAuditResponse.OverallSection overall = new RuleAuditResponse.OverallSection(
                totalStaging, autoApproveCount, autoDuplicateCount, autoRejectCount, adminReviewCount
        );

        return new RuleAuditResponse(
                overall, ruleBreakdown, ptBreakdown, catBreakdown, srcBreakdown, matrix, recommendations, province, city
        );
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

    private boolean hasHighOrMediumConfidenceDupes(StagingPlaceDetailResponse detail) {
        if (detail.getCandidates() == null || detail.getCandidates().isEmpty()) {
            return false;
        }
        return detail.getCandidates().stream()
                .anyMatch(c -> "HIGH".equals(c.getMatchConfidence()) || "MEDIUM".equals(c.getMatchConfidence()));
    }

    private List<RuleAuditResponse.Recommendation> buildRecommendations(
            List<AuditRecord> auditRecords, Map<String, Integer> categoryCounts) {

        Map<String, List<AuditRecord>> byCategory = auditRecords.stream()
                .collect(Collectors.groupingBy(r -> r.category));

        List<RuleAuditResponse.Recommendation> result = new ArrayList<>();

        for (Map.Entry<String, Integer> entry : categoryCounts.entrySet()) {
            if (entry.getValue() <= 0) continue;

            String category = entry.getKey();
            int count = entry.getValue();
            List<AuditRecord> records = byCategory.getOrDefault(category, List.of());

            long validCoordCount = records.stream().filter(r -> r.hasValidCoords).count();
            long knownTypeCount = records.stream().filter(r -> r.hasKnownPlaceType).count();
            long hasCategoryCount = records.stream().filter(r -> r.hasCategory).count();
            long noHighMedDupesCount = records.stream().filter(r -> !r.hasHighMedDupes).count();
            long noExactDupCount = records.stream().filter(r -> !r.hasExactDup).count();

            long fullyEligible = records.stream().filter(r ->
                    r.hasValidCoords && r.hasKnownPlaceType && r.hasCategory
                            && !r.hasHighMedDupes && !r.hasExactDup
            ).count();

            boolean allNoDupes = noHighMedDupesCount == count && noExactDupCount == count;
            boolean allValidCoords = validCoordCount == count;
            boolean allKnownType = knownTypeCount == count;
            boolean allCategorized = hasCategoryCount == count;

            if (fullyEligible >= count * 0.5 && allValidCoords && allKnownType && allNoDupes && allCategorized) {
                result.add(new RuleAuditResponse.Recommendation(
                        category, count,
                        "Potential candidate for future AUTO_APPROVE",
                        buildEligibleReason(fullyEligible, count, allValidCoords, allKnownType, allCategorized, allNoDupes)
                ));
            } else if (noHighMedDupesCount == count && noExactDupCount == count) {
                result.add(new RuleAuditResponse.Recommendation(
                        category, count,
                        "Potential candidate for future AUTO_APPROVE",
                        "No duplicate issues (" + count + "/" + count + " clean). "
                                + "Issues: " + (count - fullyEligible) + "/" + count + " fail eligibility criteria."
                ));
            } else if (hasHighMedDupes(records)) {
                result.add(new RuleAuditResponse.Recommendation(
                        category, count,
                        "Keep manual review",
                        (count - noHighMedDupesCount) + "/" + count + " have HIGH/MEDIUM confidence duplicates"
                ));
            } else {
                result.add(new RuleAuditResponse.Recommendation(
                        category, count,
                        "Keep manual review",
                        "Records need admin assessment. Valid coords: " + validCoordCount + "/" + count
                ));
            }
        }

        result.sort(Comparator.comparingInt(RuleAuditResponse.Recommendation::getCount).reversed());

        return result;
    }

    private String buildEligibleReason(boolean allValidCoords, boolean allKnownType,
                                       boolean allCategorized, boolean allNoDupes) {
        List<String> parts = new ArrayList<>();
        if (allValidCoords) parts.add("valid coordinates");
        if (allKnownType) parts.add("supported category");
        if (allNoDupes) parts.add("no duplicate");
        if (allCategorized) parts.add("has category mapping");
        return String.join(", ", parts);
    }

    private String buildEligibleReason(long fullyEligible, int total, boolean allValidCoords,
                                       boolean allKnownType, boolean allCategorized, boolean allNoDupes) {
        List<String> parts = new ArrayList<>();
        if (allValidCoords) parts.add("valid coordinates");
        if (allKnownType) parts.add("supported place type");
        if (allCategorized) parts.add("has category");
        if (allNoDupes) parts.add("no duplicate");
        parts.add(fullyEligible + "/" + total + " fully eligible");
        return String.join(", ", parts);
    }

    private boolean hasHighMedDupes(List<AuditRecord> records) {
        return records.stream().anyMatch(r -> r.hasHighMedDupes || r.hasExactDup);
    }

    private record AuditRecord(
            String category,
            boolean hasValidCoords,
            boolean hasKnownPlaceType,
            boolean hasCategory,
            boolean hasHighMedDupes,
            boolean hasExactDup,
            String ruleName
    ) {}
}
