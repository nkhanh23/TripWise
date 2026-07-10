package com.tripwise.place.presentation.controller;

import com.tripwise.common.api.ApiResponse;
import com.tripwise.common.api.PageResponse;
import com.tripwise.place.application.dto.StagingPlaceDetailResponse;
import com.tripwise.place.application.dto.StagingPlaceModerationResponse;
import com.tripwise.place.application.dto.StagingPlaceSearchQuery;
import com.tripwise.place.application.dto.AutoModerationExecutionReport;
import com.tripwise.place.application.dto.AutoModerationPreview;
import com.tripwise.place.application.dto.ExplainExclusiveReport;
import com.tripwise.place.application.dto.ExplainReport;
import com.tripwise.place.application.dto.RuleAuditResponse;
import com.tripwise.place.application.service.AutoModerationBatchPublishService;
import com.tripwise.place.application.service.AutoModerationExecutionService;
import com.tripwise.place.application.service.AutoModerationExplainService;
import com.tripwise.place.application.service.RuleAuditService;
import com.tripwise.place.application.service.StagingPlaceModerationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/place-moderation/staging")
@Validated
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Admin Place Moderation", description = "Staging place review and moderation queue endpoints for admin")
public class StagingPlaceModerationController {

    private static final int DEFAULT_PAGE = 0;
    private static final int DEFAULT_SIZE = 20;
    private static final int MAX_PAGE_SIZE = 100;

    private final StagingPlaceModerationService moderationService;
    private final com.tripwise.place.application.service.AutoModerationSimulationService simulationService;
    private final RuleAuditService ruleAuditService;
    private final com.tripwise.place.application.service.SimulationDiagnosticService diagnosticService;
    private final AutoModerationExecutionService executionService;
    private final AutoModerationExplainService explainService;
    private final AutoModerationBatchPublishService batchPublishService;
    private final com.tripwise.place.application.service.PublishVerificationService verificationService;

    @GetMapping
    @Operation(summary = "Search staging places", description = "Return paginated staging place records for moderation.")
    public ResponseEntity<ApiResponse<PageResponse<StagingPlaceModerationResponse>>> searchStaging(
            @RequestParam(required = false) Long importRunId,
            @RequestParam(required = false) String province,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String moderationStatus,
            @RequestParam(required = false) String dedupStatus,
            @RequestParam(required = false) String placeTypeDraft,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "asc") String sortDirection,
            @RequestParam(defaultValue = "0") Integer page,
            @RequestParam(defaultValue = "20") Integer size
    ) {
        StagingPlaceSearchQuery query = StagingPlaceSearchQuery.builder()
                .importRunId(importRunId)
                .province(province)
                .city(city)
                .moderationStatus(moderationStatus)
                .dedupStatus(dedupStatus)
                .placeTypeDraft(placeTypeDraft)
                .keyword(keyword)
                .build();

        PageRequest pageRequest = PageRequest.of(normalizePage(page), normalizeSize(size));

        PageResponse<StagingPlaceModerationResponse> response = PageResponse.of(
                moderationService.search(
                        query,
                        pageRequest,
                        normalizeSortBy(sortBy),
                        sortDirection
                )
        );

        return ResponseEntity.ok(ApiResponse.success("Staging places fetched successfully", response));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get staging place details", description = "Return detail for a staging place including dedup candidates.")
    public ResponseEntity<ApiResponse<StagingPlaceDetailResponse>> getStagingDetail(@PathVariable Long id) {
        StagingPlaceDetailResponse detail = moderationService.getDetail(id);
        return ResponseEntity.ok(ApiResponse.success("Staging place detail fetched successfully", detail));
    }

    @PostMapping("/{id}/approve-as-new")
    @Operation(summary = "Approve staging record as new", description = "Approve staging record to be applied as new public place.")
    public ResponseEntity<ApiResponse<Void>> approveAsNew(@PathVariable Long id) {
        moderationService.approveAsNew(id);
        return ResponseEntity.ok(ApiResponse.success("Staging record approved as new successfully", null));
    }

    @PostMapping("/{id}/approve-and-publish")
    @Operation(summary = "Approve staging record and publish immediately", description = "Validate staging record, run duplicate guards, insert into public database and mark applied.")
    public ResponseEntity<ApiResponse<Long>> approveAndPublish(@PathVariable Long id) {
        Long publicId = moderationService.approveAndPublish(id);
        return ResponseEntity.ok(ApiResponse.success("Staging record approved and published successfully", publicId));
    }

    @PostMapping("/{id}/reject")
    @Operation(summary = "Reject staging record", description = "Reject staging record.")
    public ResponseEntity<ApiResponse<Void>> reject(@PathVariable Long id) {
        moderationService.reject(id);
        return ResponseEntity.ok(ApiResponse.success("Staging record rejected successfully", null));
    }

    @PostMapping("/{id}/mark-duplicate")
    @Operation(summary = "Link staging record to existing duplicate", description = "Approve specific duplicate candidate and mark staging record as duplicate skip.")
    public ResponseEntity<ApiResponse<Void>> markDuplicate(
            @PathVariable Long id,
            @RequestBody @Validated MarkDuplicateRequest request
    ) {
        moderationService.markDuplicate(id, request.getCandidateId(), request.getExistingPlaceId());
        return ResponseEntity.ok(ApiResponse.success("Staging record marked as duplicate successfully", null));
    }

    @PostMapping("/simulation")
    @Operation(summary = "Run auto moderation simulation", description = "Evaluate pending staging records and show auto moderation statistics without modifying DB.")
    public ResponseEntity<ApiResponse<java.util.Map<String, Object>>> runSimulation(
            @RequestParam String province,
            @RequestParam String city
    ) {
        java.util.Map<String, Object> result = simulationService.runSimulation(province, city);
        return ResponseEntity.ok(ApiResponse.success("Simulation completed successfully", result));
    }

    @PostMapping("/simulation-diagnostic")
    @Operation(summary = "Detailed simulation diagnostic", description = "Trace every step for each record.")
    public ResponseEntity<ApiResponse<java.util.Map<String, Object>>> runDiagnostic(
            @RequestParam String province,
            @RequestParam String city,
            @RequestParam(defaultValue = "20") int sampleSize
    ) {
        java.util.Map<String, Object> result = diagnosticService.runDiagnostic(province, city, sampleSize);
        return ResponseEntity.ok(ApiResponse.success("Diagnostic completed successfully", result));
    }

    @PostMapping("/rule-audit")
    @Operation(summary = "Rule audit for pending staging records")
    public ResponseEntity<ApiResponse<RuleAuditResponse>> runRuleAudit(
            @RequestParam String province,
            @RequestParam String city
    ) {
        RuleAuditResponse result = ruleAuditService.runAudit(province, city);
        return ResponseEntity.ok(ApiResponse.success("Rule audit completed successfully", result));
    }

    @PostMapping("/explain")
    @Operation(summary = "Explain auto moderation decisions")
    public ResponseEntity<ApiResponse<ExplainReport>> explainAutoModeration(
            @RequestParam String province,
            @RequestParam String city
    ) {
        try {
            ExplainReport report = explainService.explain(province, city);
            return ResponseEntity.ok(ApiResponse.success("Explain report completed successfully", report));
        } catch (Exception e) {
            log.error("Explain failed for province='{}', city='{}': {}", province, city, e.getMessage(), e);
            throw e;
        }
    }

    @PostMapping("/explain-exclusive")
    @Operation(summary = "Exclusive auto moderation explain")
    public ResponseEntity<ApiResponse<ExplainExclusiveReport>> explainExclusiveAutoModeration(
            @RequestParam String province,
            @RequestParam String city
    ) {
        try {
            ExplainExclusiveReport report = explainService.explainExclusive(province, city);
            return ResponseEntity.ok(ApiResponse.success("Exclusive explain report completed successfully", report));
        } catch (Exception e) {
            log.error("Exclusive explain failed for province='{}', city='{}': {}", province, city, e.getMessage(), e);
            throw e;
        }
    }

    @GetMapping("/auto-execute/preview")
    @Operation(summary = "Preview auto moderation")
    public ResponseEntity<ApiResponse<AutoModerationPreview>> previewAutoModeration(
            @RequestParam String province,
            @RequestParam String city
    ) {
        AutoModerationPreview preview = executionService.preview(province, city);
        return ResponseEntity.ok(ApiResponse.success("Auto moderation preview completed", preview));
    }

    @PostMapping("/auto-execute")
    @Operation(summary = "Execute auto moderation")
    public ResponseEntity<ApiResponse<AutoModerationExecutionReport>> executeAutoModeration(
            @RequestParam String province,
            @RequestParam String city
    ) {
        AutoModerationExecutionReport report = executionService.execute(province, city);
        return ResponseEntity.ok(ApiResponse.success("Auto moderation execution completed", report));
    }

    @PostMapping("/auto-publish")
    @Operation(summary = "Auto publish eligible records",
               description = "Publish all staging records marked AUTO_APPROVE by the rule engine in chunks of 100. "
                           + "One chunk = one transaction. Failures do not block remaining chunks. "
                           + "Already-published records are skipped with idempotency guards. Fully auditable.")
    public ResponseEntity<ApiResponse<com.tripwise.place.application.dto.AutoModerationBatchPublishReport>> autoPublish(
            @RequestParam String province,
            @RequestParam String city
    ) {
        com.tripwise.place.application.dto.AutoModerationBatchPublishReport report =
                batchPublishService.publishEligible(province, city);
        return ResponseEntity.ok(ApiResponse.success("Auto publish completed", report));
    }

    private int normalizePage(Integer page) {
        return page == null || page < 0 ? DEFAULT_PAGE : page;
    }

    private int normalizeSize(Integer size) {
        if (size == null || size < 1) {
            return DEFAULT_SIZE;
        }
        return Math.min(size, MAX_PAGE_SIZE);
    }

    private String normalizeSortBy(String sortBy) {
        if (sortBy == null || sortBy.isBlank()) {
            return "id";
        }
        return switch (sortBy.trim()) {
            case "id", "name", "createdAt", "updatedAt" -> sortBy.trim();
            default -> "id";
        };
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MarkDuplicateRequest {
        private Long candidateId;
        private Long existingPlaceId;
    }
    @PostMapping("/publish-verification")
    @Operation(summary = "Verify publish safety", description = "READ ONLY. Verifies every eligible AUTO_APPROVE record can be published without errors. Checks duplicates, categories, coordinates, sources, names. No writes.")
    public ResponseEntity<ApiResponse<com.tripwise.place.application.dto.PublishVerificationReport>> verifyPublish(
            @RequestParam String province,
            @RequestParam String city
    ) {
        var report = verificationService.verify(province, city);
        return ResponseEntity.ok(ApiResponse.success("Publish verification complete", report));
    }
}
