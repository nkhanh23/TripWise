package com.tripwise.place.application.service;

import com.tripwise.place.application.dto.StagingPlaceDetailResponse;
import com.tripwise.place.application.service.simulation.AutoModerationRuleEngine;
import com.tripwise.place.infrastructure.persistence.PlaceStagingModerationJdbcRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AutoModerationRuleAuditService {

    private final PlaceStagingModerationJdbcRepository repository;
    private final AutoModerationRuleEngine ruleEngine;

    @Transactional(readOnly = true)
    public Map<String, Object> runAudit(String province, String city) {
        log.info("Running rule audit for province='{}', city='{}'", province, city);
        List<Long> ids = repository.findPendingStagingIds(province, city);
        log.info("Found {} pending staging records for audit.", ids.size());

        int totalRecords = ids.size();
        Map<String, Integer> ruleCounts = new HashMap<>();
        Map<String, Integer> placeTypeCounts = new HashMap<>();
        Map<String, Integer> categoryCounts = new HashMap<>();
        Map<String, Integer> sourceCounts = new HashMap<>();
        Map<String, Map<String, Integer>> ruleCategoryBreakdown = new HashMap<>();

        for (Long id : ids) {
            try {
                StagingPlaceDetailResponse detail = repository.findById(id).orElse(null);
                if (detail == null) continue;

                // Evaluate staging place
                AutoModerationRuleEngine.EvaluationResult result = ruleEngine.evaluate(detail);

                // Map rules to exact requested names
                String ruleName = mapToRuleName(result.subCategory());

                ruleCounts.merge(ruleName, 1, Integer::sum);

                String placeType = detail.getStagingPlace() != null && detail.getStagingPlace().getPlaceTypeDraft() != null
                        ? detail.getStagingPlace().getPlaceTypeDraft().toUpperCase()
                        : "PENDING_ADMIN_REVIEW";
                placeTypeCounts.merge(placeType, 1, Integer::sum);

                String category = detail.getCategories().stream()
                        .filter(c -> Boolean.TRUE.equals(c.getIsPrimary()))
                        .map(StagingPlaceDetailResponse.CategoryResponse::getCategoryLabel)
                        .findFirst()
                        .orElse("Unknown Category");
                categoryCounts.merge(category, 1, Integer::sum);

                String source = detail.getStagingPlace() != null && detail.getStagingPlace().getSource() != null
                        ? detail.getStagingPlace().getSource()
                        : "UNKNOWN";
                String mappedSource = mapSource(source);
                sourceCounts.merge(mappedSource, 1, Integer::sum);

                ruleCategoryBreakdown.computeIfAbsent(ruleName, k -> new HashMap<>())
                        .merge(category, 1, Integer::sum);

            } catch (Exception e) {
                log.error("Failed to audit record ID={}: {}", id, e.getMessage(), e);
                ruleCounts.merge("OtherReviewRule", 1, Integer::sum);
                placeTypeCounts.merge("PENDING_ADMIN_REVIEW", 1, Integer::sum);
                categoryCounts.merge("Unknown Category", 1, Integer::sum);
                sourceCounts.merge("UNKNOWN", 1, Integer::sum);
                ruleCategoryBreakdown.computeIfAbsent("OtherReviewRule", k -> new HashMap<>())
                        .merge("Evaluation Error", 1, Integer::sum);
            }
        }

        // Sort categories by count descending
        List<Map.Entry<String, Integer>> sortedCategories = categoryCounts.entrySet().stream()
                .sorted((a, b) -> b.getValue().compareTo(a.getValue()))
                .collect(Collectors.toList());

        List<Map.Entry<String, Integer>> top30Categories = sortedCategories.stream()
                .limit(30)
                .collect(Collectors.toList());

        // Generate recommendations
        Map<String, String> recommendations = new LinkedHashMap<>();
        for (Map.Entry<String, Integer> entry : sortedCategories) {
            String category = entry.getKey();
            if (isCandidateForAutoApprove(category)) {
                recommendations.put(category, "Candidate for Auto Approve.");
            } else {
                recommendations.put(category, "Keep Admin Review.");
            }
        }

        // Potential savings calculator
        int ambiguousRuleTotal = ruleCounts.getOrDefault("AmbiguousPlaceTypeRule", 0);

        // Find how many Restaurant/Cafe/Bakery match under AmbiguousPlaceTypeRule
        Map<String, Integer> ambiguousBreakdown = ruleCategoryBreakdown.getOrDefault("AmbiguousPlaceTypeRule", Map.of());
        int countRelax1 = 0;
        for (Map.Entry<String, Integer> entry : ambiguousBreakdown.entrySet()) {
            if (isCategoryRelax1(entry.getKey())) {
                countRelax1 += entry.getValue();
            }
        }
        int remainingAfterRelax1 = totalRecords - countRelax1;

        int countRelax2 = 0;
        for (Map.Entry<String, Integer> entry : ambiguousBreakdown.entrySet()) {
            if (isCategoryRelax2(entry.getKey())) {
                countRelax2 += entry.getValue();
            }
        }
        int remainingAfterRelax2 = remainingAfterRelax1 - countRelax2;

        String formattedReport = formatReport(province, city, totalRecords, ruleCounts, placeTypeCounts, top30Categories, sourceCounts,
                ruleCategoryBreakdown, recommendations, remainingAfterRelax1, remainingAfterRelax2);
        System.out.println(formattedReport);
        log.info("\n" + formattedReport);

        Map<String, Object> result = new HashMap<>();
        result.put("province", province);
        result.put("city", city);
        result.put("totalRecords", totalRecords);
        result.put("ruleCounts", ruleCounts);
        result.put("placeTypeCounts", placeTypeCounts);
        result.put("categoryCounts", categoryCounts);
        result.put("top30Categories", top30Categories.stream().collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue, (a, b) -> a, LinkedHashMap::new)));
        result.put("sourceCounts", sourceCounts);
        result.put("ruleCategoryBreakdown", ruleCategoryBreakdown);
        result.put("recommendations", recommendations);
        result.put("remainingAfterRelax1", remainingAfterRelax1);
        result.put("remainingAfterRelax2", remainingAfterRelax2);
        result.put("formattedReport", formattedReport);

        return result;
    }

    private String mapToRuleName(String subCategory) {
        if (subCategory == null) return "OtherReviewRule";
        return switch (subCategory.trim()) {
            case "Ambiguous place type" -> "AmbiguousPlaceTypeRule";
            case "Duplicate confidence MEDIUM" -> "DuplicateConfidenceMediumRule";
            case "Duplicate confidence LOW" -> "DuplicateConfidenceLowRule";
            default -> "OtherReviewRule";
        };
    }

    private String mapSource(String source) {
        if (source.equalsIgnoreCase("OSM_GEOFABRIK")) return "OSM";
        if (source.equalsIgnoreCase("FOURSQUARE_OS_PLACES")) return "Foursquare";
        return source;
    }

    private boolean isCandidateForAutoApprove(String category) {
        String lower = category.toLowerCase();
        return lower.contains("restaurant") || lower.contains("nha hang") ||
                lower.contains("cafe") || lower.contains("ca phe") ||
                lower.contains("bakery") || lower.contains("tiem banh") ||
                lower.contains("coffee") || lower.contains("tea") ||
                lower.contains("food") || lower.contains("sushi") ||
                lower.contains("bistro") || lower.contains("snack") ||
                lower.contains("pub") || lower.contains("bar") ||
                lower.contains("ice cream");
    }

    private boolean isCategoryRelax1(String category) {
        String lower = category.toLowerCase();
        return lower.equals("restaurant") || lower.contains("restaurant") || lower.contains("nha hang") ||
                lower.equals("cafe") || lower.contains("cafe") || lower.contains("ca phe") ||
                lower.equals("bakery") || lower.contains("bakery") || lower.contains("tiem banh");
    }

    private boolean isCategoryRelax2(String category) {
        String lower = category.toLowerCase();
        return lower.contains("coffee shop") || lower.contains("coffee") || lower.contains("quan ca phe");
    }

    private String formatReport(
            String province, String city,
            int totalRecords,
            Map<String, Integer> ruleCounts,
            Map<String, Integer> placeTypeCounts,
            List<Map.Entry<String, Integer>> top30Categories,
            Map<String, Integer> sourceCounts,
            Map<String, Map<String, Integer>> ruleCategoryBreakdown,
            Map<String, String> recommendations,
            int remainingAfterRelax1,
            int remainingAfterRelax2
    ) {
        StringBuilder sb = new StringBuilder();
        sb.append("\n==================================================\n");
        sb.append(" RULE AUDIT REPORT: ").append(city).append(", ").append(province).append("\n");
        sb.append("==================================================\n");
        sb.append("Total records: ").append(totalRecords).append("\n");
        sb.append("==================================================\n\n");

        sb.append("Theo Rule:\n");
        for (Map.Entry<String, Integer> entry : ruleCounts.entrySet()) {
            sb.append("  ").append(entry.getKey()).append(": ").append(entry.getValue()).append("\n");
        }
        sb.append("\n==================================================\n\n");

        sb.append("Theo PlaceTypeDraft:\n");
        for (Map.Entry<String, Integer> entry : placeTypeCounts.entrySet()) {
            sb.append("  ").append(entry.getKey()).append(": ").append(entry.getValue()).append("\n");
        }
        sb.append("\n==================================================\n\n");

        sb.append("Theo Category (Top 30):\n");
        for (Map.Entry<String, Integer> entry : top30Categories) {
            sb.append("  ").append(entry.getKey()).append(": ").append(entry.getValue()).append("\n");
        }
        sb.append("\n==================================================\n\n");

        sb.append("Theo Source:\n");
        for (Map.Entry<String, Integer> entry : sourceCounts.entrySet()) {
            sb.append("  ").append(entry.getKey()).append(": ").append(entry.getValue()).append("\n");
        }
        sb.append("\n==================================================\n\n");

        sb.append("Rule breakdowns by Category:\n");
        for (Map.Entry<String, Map<String, Integer>> ruleEntry : ruleCategoryBreakdown.entrySet()) {
            sb.append("Rule: ").append(ruleEntry.getKey()).append("\n");
            sb.append("Top category:\n");
            List<Map.Entry<String, Integer>> sortedRuleCats = ruleEntry.getValue().entrySet().stream()
                    .sorted((a, b) -> b.getValue().compareTo(a.getValue()))
                    .limit(10)
                    .collect(Collectors.toList());
            for (Map.Entry<String, Integer> catEntry : sortedRuleCats) {
                sb.append("  - ").append(catEntry.getKey()).append(": ").append(catEntry.getValue()).append("\n");
            }
            sb.append("\n");
        }
        sb.append("==================================================\n\n");

        sb.append("Recommendation:\n");
        List<Map.Entry<String, String>> sampleRecs = recommendations.entrySet().stream()
                .limit(10)
                .collect(Collectors.toList());
        for (Map.Entry<String, String> entry : sampleRecs) {
            sb.append("Category: ").append(entry.getKey()).append("\n");
            sb.append("Recommendation: ").append(entry.getValue()).append("\n");
            sb.append("--------------------------------\n");
        }
        sb.append("\n==================================================\n\n");

        sb.append("SAVINGS PREDICTION:\n");
        sb.append("Current Admin Review: ").append(totalRecords).append("\n");
        sb.append("Nếu bỏ Ambiguous rule với Restaurant/Cafe/Bakery:\n");
        sb.append("  Admin review còn: ").append(remainingAfterRelax1).append("\n");
        sb.append("Nếu tiếp tục approve thêm Coffee Shop:\n");
        sb.append("  Admin review còn: ").append(remainingAfterRelax2).append("\n");
        sb.append("==================================================\n");

        return sb.toString();
    }
}
