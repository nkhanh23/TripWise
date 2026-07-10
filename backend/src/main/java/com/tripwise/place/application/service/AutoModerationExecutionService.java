package com.tripwise.place.application.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tripwise.place.application.dto.AutoModerationExecutionReport;
import com.tripwise.place.application.dto.AutoModerationExecutionReport.ExecutionRecord;
import com.tripwise.place.application.dto.AutoModerationPreview;
import com.tripwise.place.application.dto.AutoModerationPreview.PreviewRecord;
import com.tripwise.place.application.dto.DedupCandidateResponse;
import com.tripwise.place.application.dto.StagingPlaceDetailResponse;
import com.tripwise.place.application.service.simulation.AutoModerationRuleEngine;
import com.tripwise.place.application.service.simulation.SimulationCategory;
import com.tripwise.place.application.service.simulation.StagingPlaceTypeReclassifier;
import com.tripwise.place.infrastructure.persistence.AutoModerationAuditJdbcRepository;
import com.tripwise.place.infrastructure.persistence.PlaceStagingModerationJdbcRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class AutoModerationExecutionService {

    private static final Set<String> KNOWN_TYPES = Set.of("ATTRACTION", "FOOD", "HOTEL", "SERVICE");

    private final PlaceStagingModerationJdbcRepository repository;
    private final StagingPlaceTypeReclassifier reclassifier;
    private final AutoModerationRuleEngine ruleEngine;
    private final StagingPlaceModerationService moderationService;
    private final AutoModerationAuditJdbcRepository auditRepository;
    private final ObjectProvider<PlatformTransactionManager> transactionManagerProvider;
    private final ObjectMapper objectMapper;

    public AutoModerationPreview preview(String province, String city) {
        List<Long> ids = repository.findPendingStagingIds(province, city);
        log.info("Preview for province='{}', city='{}': {} pending records", province, city, ids.size());
        List<PreviewRecord> records = new ArrayList<>();
        int autoApprove = 0, autoDuplicate = 0, autoReject = 0, adminReview = 0;
        for (Long id : ids) {
            try {
                StagingPlaceDetailResponse detail = repository.findById(id).orElse(null);
                if (detail == null) continue;
                reclassifier.reclassify(detail);
                var result = ruleEngine.evaluate(detail);
                String decision = switch (result.category()) {
                    case AUTO_APPROVE -> { autoApprove++; yield "AUTO_APPROVE"; }
                    case AUTO_DUPLICATE -> { autoDuplicate++; yield "AUTO_DUPLICATE"; }
                    case AUTO_REJECT -> { autoReject++; yield "AUTO_REJECT"; }
                    case NEEDS_ADMIN_REVIEW -> { adminReview++; yield "NEEDS_ADMIN_REVIEW"; }
                };
                String name = detail.getStagingPlace() != null ? detail.getStagingPlace().getName() : null;
                records.add(new PreviewRecord(id, name, decision, result.subCategory()));
            } catch (Exception e) {
                log.error("Preview failed for staging ID={}: {}", id, e.getMessage());
                adminReview++;
                records.add(new PreviewRecord(id, null, "NEEDS_ADMIN_REVIEW", "Evaluation error"));
            }
        }
        return new AutoModerationPreview(province, city, ids.size(), autoApprove, autoDuplicate, autoReject, adminReview, records);
    }

    public AutoModerationExecutionReport execute(String province, String city) {
        long batchStart = System.currentTimeMillis();
        List<Long> ids = repository.findPendingStagingIds(province, city);
        log.info("Auto execution for province='{}', city='{}': {} pending", province, city, ids.size());
        List<ExecutionRecord> records = new ArrayList<>();
        for (Long id : ids) {
            long recStart = System.currentTimeMillis();
            PlatformTransactionManager tm = transactionManagerProvider.getIfUnique();
            TransactionTemplate tx = tm != null ? new TransactionTemplate(tm) : null;
            try {
                String action = executeWithTx(tx, id);
                long dur = System.currentTimeMillis() - recStart;
                StagingPlaceDetailResponse detail = repository.findById(id).orElse(null);
                String name = detail != null && detail.getStagingPlace() != null ? detail.getStagingPlace().getName() : null;
                String dec = switch (action) {
                    case "PUBLISH" -> "AUTO_APPROVE";
                    case "DUPLICATE" -> "AUTO_DUPLICATE";
                    case "REJECT" -> "AUTO_REJECT";
                    default -> "NEEDS_ADMIN_REVIEW";
                };
                records.add(new ExecutionRecord(id, name, dec, action, "SUCCESS", null, dur));
            } catch (Exception e) {
                long dur = System.currentTimeMillis() - recStart;
                records.add(new ExecutionRecord(id, null, "NEEDS_ADMIN_REVIEW", "FAILED", "FAILED", e.getMessage(), dur));
                log.error("Failed auto-exec staging ID={}: {}", id, e.getMessage());
            }
        }
        long dur = System.currentTimeMillis() - batchStart;
        int pub = (int) records.stream().filter(r -> "PUBLISH".equals(r.actionExecuted())).count();
        int dup = (int) records.stream().filter(r -> "DUPLICATE".equals(r.actionExecuted())).count();
        int rej = (int) records.stream().filter(r -> "REJECT".equals(r.actionExecuted())).count();
        int skip = (int) records.stream().filter(r -> "SKIP".equals(r.actionExecuted())).count();
        int fail = (int) records.stream().filter(r -> "FAILED".equals(r.actionExecuted())).count();
        persistAudit(province, city, ids.size(), pub, dup, rej, skip, fail, dur, records);
        return new AutoModerationExecutionReport(ids.size(), pub, dup, rej, skip, fail, dur, records);
    }

    private void persistAudit(String p, String c, int t, int pub, int dup, int rej, int sk, int fail, long dur, List<ExecutionRecord> records) {
        try {
            Map<String, Object> m = new java.util.LinkedHashMap<>();
            m.put("province", p);
            m.put("city", c);
            m.put("totalScanned", t);
            m.put("executionTimeMs", dur);
            String json = objectMapper.writeValueAsString(m);
            long bid = auditRepository.createBatch(p, c, t, pub, dup, rej, sk, fail, dur, json);
            for (var r : records) {
                auditRepository.insertRecord(bid, r.stagingId(), r.name(), r.decision(), r.actionExecuted(),
                        "FAILED".equals(r.actionExecuted()) ? "FAILED" : "SUCCESS", r.failureReason(), r.executionDurationMs());
            }
        } catch (JsonProcessingException e) {
            log.error("Audit JSON failed: {}", e.getMessage());
        }
    }

    private String executeWithTx(TransactionTemplate tx, Long id) {
        if (tx != null) return tx.execute(s -> executeAction(id));
        return executeAction(id);
    }

    private String executeAction(Long id) {
        StagingPlaceDetailResponse detail = repository.findById(id).orElse(null);
        if (detail == null) return "SKIP";
        reclassifier.reclassify(detail);
        var result = ruleEngine.evaluate(detail);
        return switch (result.category()) {
            case AUTO_APPROVE -> {
                String t = detail.getStagingPlace().getPlaceTypeDraft();
                if (t != null && KNOWN_TYPES.contains(t)) repository.updatePlaceTypeDraft(id, t);
                moderationService.approveAndPublish(id);
                yield "PUBLISH";
            }
            case AUTO_DUPLICATE -> {
                if (detail.getExistingPublicDuplicate() != null) {
                    moderationService.markDuplicate(id, null, detail.getExistingPublicDuplicate().existingPublicId());
                } else if (detail.getCandidates() != null) {
                    var best = detail.getCandidates().stream()
                            .filter(c -> "HIGH".equals(c.getMatchConfidence())).findFirst().orElse(null);
                    if (best != null) moderationService.markDuplicate(id, best.getId(), best.getExistingPlaceId());
                }
                yield "DUPLICATE";
            }
            case AUTO_REJECT -> { moderationService.reject(id); yield "REJECT"; }
            case NEEDS_ADMIN_REVIEW -> "SKIP";
        };
    }
}