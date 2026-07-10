package com.tripwise.place.application.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tripwise.common.exception.BusinessException;
import com.tripwise.place.application.dto.AutoModerationBatchPublishReport;
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

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class AutoModerationBatchPublishService {

    private static final Set<String> KNOWN_TYPES = Set.of("ATTRACTION", "FOOD", "HOTEL", "SERVICE");
    private static final int DEFAULT_CHUNK_SIZE = 100;

    private final PlaceStagingModerationJdbcRepository repository;
    private final StagingPlaceTypeReclassifier reclassifier;
    private final AutoModerationRuleEngine ruleEngine;
    private final StagingPlaceModerationService moderationService;
    private final AutoModerationAuditJdbcRepository auditRepository;
    private final ObjectProvider<PlatformTransactionManager> transactionManagerProvider;
    private final ObjectMapper objectMapper;

    public AutoModerationBatchPublishReport publishEligible(String province, String city) {
        return publishEligible(province, city, DEFAULT_CHUNK_SIZE);
    }

    public AutoModerationBatchPublishReport publishEligible(String province, String city, int chunkSize) {
        long startTime = System.currentTimeMillis();
        List<Long> allPending = repository.findPendingStagingIds(province, city);
        log.info("Batch publish scan: province='{}', city='{}', pending={}", province, city, allPending.size());

        List<AutoModerationBatchPublishReport.PublishedRecord> publishedRecords = new ArrayList<>();
        List<AutoModerationBatchPublishReport.ChunkStats> chunkStats = new ArrayList<>();

        List<Long> eligible = new ArrayList<>();
        Map<Long, String> names = new LinkedHashMap<>();
        Map<Long, String> types = new LinkedHashMap<>();

        for (Long id : allPending) {
            try {
                StagingPlaceDetailResponse detail = repository.findById(id).orElse(null);
                if (detail == null || detail.getStagingPlace() == null) continue;

                reclassifier.reclassify(detail);
                String newType = detail.getStagingPlace().getPlaceTypeDraft();
                if (newType != null && KNOWN_TYPES.contains(newType.toUpperCase())) {
                    repository.updatePlaceTypeDraft(id, newType);
                }
                var result = ruleEngine.evaluate(detail);

                if (result.category() == SimulationCategory.AUTO_APPROVE) {
                    String type = detail.getStagingPlace().getPlaceTypeDraft();
                    if (type != null && KNOWN_TYPES.contains(type.toUpperCase())) {
                        eligible.add(id);
                        names.put(id, detail.getStagingPlace().getName());
                        types.put(id, type);
                    }
                }
            } catch (Exception e) {
                log.warn("Eval failed staging ID={}: {}", id, e.getMessage());
            }
        }

        log.info("Eligible for auto-publish: {} / {}", eligible.size(), allPending.size());

        List<List<Long>> chunks = partition(eligible, chunkSize);
        int totalPub = 0, totalFail = 0, totalSkip = 0;
        int okChunks = 0, badChunks = 0;

        PlatformTransactionManager tm = transactionManagerProvider.getIfUnique();
        TransactionTemplate txTemplate = tm != null ? new TransactionTemplate(tm) : null;

        for (int ci = 0; ci < chunks.size(); ci++) {
            List<Long> chunk = chunks.get(ci);
            long chunkStart = System.currentTimeMillis();
            int chunkPub = 0, chunkFail = 0;

            for (Long id : chunk) {
                long recStart = System.currentTimeMillis();
                try {
                    Long finalPublicId;
                    if (txTemplate != null) {
                        finalPublicId = txTemplate.execute(status ->
                            moderationService.approveAndPublish(id)
                        );
                    } else {
                        finalPublicId = moderationService.approveAndPublish(id);
                    }
                    long dur = System.currentTimeMillis() - recStart;
                    publishedRecords.add(new AutoModerationBatchPublishReport.PublishedRecord(
                        id, names.get(id), types.get(id),
                        finalPublicId, "HOTEL".equals(types.get(id)) ? "HOTEL" : "PLACE", dur
                    ));
                    chunkPub++;
                } catch (BusinessException be) {
                    chunkFail++;
                    log.warn("Conflict staging ID={}: {}", id, be.getMessage());
                } catch (Exception e) {
                    chunkFail++;
                    log.error("Failed staging ID={}: {}", id, e.getMessage(), e);
                }
            }

            long chunkDur = System.currentTimeMillis() - chunkStart;
            chunkStats.add(new AutoModerationBatchPublishReport.ChunkStats(
                ci, chunk.size(), chunkPub, chunkFail, chunkDur
            ));
            if (chunkFail == 0) okChunks++; else badChunks++;
            totalPub += chunkPub;
            totalFail += chunkFail;
            totalSkip += (chunk.size() - chunkPub - chunkFail);

            log.info("Chunk {} done: {}/{} in {}ms", ci, chunkPub, chunk.size(), chunkDur);
        }

        long totalDur = System.currentTimeMillis() - startTime;
        persistAudit(province, city, allPending.size(), eligible.size(), totalPub, totalSkip, totalFail,
                totalDur, chunks.size(), okChunks, badChunks);

        log.info("Batch publish: {} pub, {} fail, {} chunks, {}ms",
                totalPub, totalFail, chunks.size(), totalDur);

        return new AutoModerationBatchPublishReport(
            province, city, allPending.size(), eligible.size(),
            totalPub, totalSkip, totalFail,
            totalDur, chunks.size(), okChunks, badChunks,
            chunkStats, publishedRecords
        );
    }

    private void persistAudit(String province, String city, int scanned, int eligible, int pub, int skip, int fail,
            long durMs, int chunks, int okCh, int badCh) {
        try {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("province", province);
            m.put("city", city);
            m.put("totalScanned", scanned);
            m.put("eligible", eligible);
            m.put("published", pub);
            m.put("skipped", skip);
            m.put("failed", fail);
            m.put("executionTimeMs", durMs);
            m.put("totalChunks", chunks);
            m.put("successfulChunks", okCh);
            m.put("failedChunks", badCh);
            m.put("mode", "AUTO_PUBLISH_BATCH");
            m.put("executedAt", Instant.now().toString());
            auditRepository.createBatch(province, city, scanned, pub, 0, 0, skip, fail, durMs,
                    objectMapper.writeValueAsString(m));
        } catch (Exception e) {
            log.error("Audit failed: {}", e.getMessage());
        }
    }

    private <T> List<List<T>> partition(List<T> list, int size) {
        List<List<T>> parts = new ArrayList<>();
        for (int i = 0; i < list.size(); i += size) {
            parts.add(list.subList(i, Math.min(i + size, list.size())));
        }
        return parts;
    }
}