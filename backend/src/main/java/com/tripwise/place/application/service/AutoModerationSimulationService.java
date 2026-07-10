package com.tripwise.place.application.service;

import com.tripwise.place.application.dto.StagingPlaceDetailResponse;
import com.tripwise.place.application.service.simulation.AutoModerationRuleEngine;
import com.tripwise.place.application.service.simulation.StagingPlaceTypeReclassifier;
import com.tripwise.place.infrastructure.persistence.PlaceStagingModerationJdbcRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class AutoModerationSimulationService {

    private final PlaceStagingModerationJdbcRepository repository;
    private final StagingPlaceTypeReclassifier reclassifier;
    private final AutoModerationRuleEngine ruleEngine;

    @Transactional(readOnly = true)
    public Map<String, Object> runSimulation(String province, String city) {
        log.info("Running auto moderation simulation for province='{}', city='{}'", province, city);
        List<Long> ids = repository.findPendingStagingIds(province, city);
        log.info("Found {} pending staging records for simulation.", ids.size());

        int totalStaging = ids.size();
        int autoApproveCount = 0;
        int autoDuplicateCount = 0;
        int autoRejectCount = 0;
        int adminReviewCount = 0;

        Map<String, Integer> approveBreakdown = new HashMap<>();
        Map<String, Integer> duplicateBreakdown = new HashMap<>();
        Map<String, Integer> rejectBreakdown = new HashMap<>();
        Map<String, Integer> reviewBreakdown = new HashMap<>();

        for (Long id : ids) {
            try {
                StagingPlaceDetailResponse detail = repository.findById(id).orElse(null);
                if (detail == null) continue;

                reclassifier.reclassify(detail);

                AutoModerationRuleEngine.EvaluationResult result = ruleEngine.evaluate(detail);

                switch (result.category()) {
                    case AUTO_APPROVE -> {
                        autoApproveCount++;
                        approveBreakdown.merge(result.subCategory(), 1, Integer::sum);
                    }
                    case AUTO_DUPLICATE -> {
                        autoDuplicateCount++;
                        duplicateBreakdown.merge(result.subCategory(), 1, Integer::sum);
                    }
                    case AUTO_REJECT -> {
                        autoRejectCount++;
                        rejectBreakdown.merge(result.subCategory(), 1, Integer::sum);
                    }
                    case NEEDS_ADMIN_REVIEW -> {
                        adminReviewCount++;
                        reviewBreakdown.merge(result.subCategory(), 1, Integer::sum);
                    }
                }
            } catch (Exception e) {
                log.error("Failed to evaluate staging record ID={}: {}", id, e.getMessage(), e);
                adminReviewCount++;
                reviewBreakdown.merge("Evaluation error: " + e.getMessage(), 1, Integer::sum);
            }
        }

        String formattedReport = formatReport(province, city, totalStaging, autoApproveCount, autoDuplicateCount, autoRejectCount, adminReviewCount,
                approveBreakdown, duplicateBreakdown, rejectBreakdown, reviewBreakdown);
        System.out.println(formattedReport);
        log.info("\n" + formattedReport);

        Map<String, Object> response = new HashMap<>();
        response.put("province", province);
        response.put("city", city);
        response.put("totalStaging", totalStaging);
        response.put("autoApprove", autoApproveCount);
        response.put("autoDuplicate", autoDuplicateCount);
        response.put("autoReject", autoRejectCount);
        response.put("adminReview", adminReviewCount);
        response.put("approveBreakdown", approveBreakdown);
        response.put("duplicateBreakdown", duplicateBreakdown);
        response.put("rejectBreakdown", rejectBreakdown);
        response.put("reviewBreakdown", reviewBreakdown);
        response.put("formattedReport", formattedReport);

        return response;
    }

    private String formatReport(
            String province, String city,
            int totalStaging, int autoApprove, int autoDuplicate, int autoReject, int adminReview,
            Map<String, Integer> approveBreakdown,
            Map<String, Integer> duplicateBreakdown,
            Map<String, Integer> rejectBreakdown,
            Map<String, Integer> reviewBreakdown
    ) {
        StringBuilder sb = new StringBuilder();
        sb.append("\n==================================================\n");
        sb.append(" AUTO MODERATION SIMULATION REPORT: ").append(city).append(", ").append(province).append("\n");
        sb.append("==================================================\n");
        sb.append("Total staging: ").append(totalStaging).append("\n\n");
        sb.append("AUTO_APPROVE: ").append(autoApprove).append("\n");
        sb.append("AUTO_DUPLICATE: ").append(autoDuplicate).append("\n");
        sb.append("AUTO_REJECT: ").append(autoReject).append("\n");
        sb.append("ADMIN_REVIEW: ").append(adminReview).append("\n");
        sb.append("==================================================\n\n");

        sb.append("AUTO_APPROVE BREAKDOWN:\n");
        if (approveBreakdown.isEmpty()) sb.append("  (None)\n");
        for (Map.Entry<String, Integer> entry : approveBreakdown.entrySet()) {
            sb.append("  - ").append(entry.getKey()).append(": ").append(entry.getValue()).append("\n");
        }
        sb.append("\n");

        sb.append("AUTO_DUPLICATE BREAKDOWN:\n");
        if (duplicateBreakdown.isEmpty()) sb.append("  (None)\n");
        for (Map.Entry<String, Integer> entry : duplicateBreakdown.entrySet()) {
            sb.append("  - ").append(entry.getKey()).append(": ").append(entry.getValue()).append("\n");
        }
        sb.append("\n");

        sb.append("AUTO_REJECT BREAKDOWN:\n");
        if (rejectBreakdown.isEmpty()) sb.append("  (None)\n");
        for (Map.Entry<String, Integer> entry : rejectBreakdown.entrySet()) {
            sb.append("  - ").append(entry.getKey()).append(": ").append(entry.getValue()).append("\n");
        }
        sb.append("\n");

        sb.append("ADMIN_REVIEW BREAKDOWN:\n");
        if (reviewBreakdown.isEmpty()) sb.append("  (None)\n");
        for (Map.Entry<String, Integer> entry : reviewBreakdown.entrySet()) {
            sb.append("  - ").append(entry.getKey()).append(": ").append(entry.getValue()).append("\n");
        }
        sb.append("==================================================\n");
        return sb.toString();
    }
}
