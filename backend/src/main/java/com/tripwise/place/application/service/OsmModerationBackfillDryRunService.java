package com.tripwise.place.application.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.tripwise.place.application.dto.PlaceImportRecord;
import com.tripwise.place.application.dto.PlaceModerationBackfillScope;
import com.tripwise.place.domain.model.PlaceType;
import com.tripwise.place.domain.model.VerificationStatus;
import com.tripwise.place.infrastructure.config.PlaceModerationBackfillMode;
import com.tripwise.place.infrastructure.persistence.PlaceImportJdbcRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.PriorityQueue;
import java.util.Set;
import java.util.regex.Pattern;

@Service
public class OsmModerationBackfillDryRunService {

    private static final String OSM_GEOFABRIK_SOURCE = "OSM_GEOFABRIK";
    private static final int FOOD_AUTO_APPROVE_MIN_QUALITY_SCORE = 75;
    private static final Set<String> FOOD_AUTO_APPROVE_AMENITIES = Set.of(
            "restaurant",
            "cafe",
            "fast_food",
            "food_court"
    );
    private static final Set<String> FOOD_BUSINESS_KEYWORDS = Set.of(
            "panel",
            "academy",
            "talent",
            "talents",
            "tai nang",
            "trung tam dao tao",
            "training",
            "education",
            "school",
            "cong ty",
            "company",
            "co ltd",
            "co., ltd",
            "ltd",
            "agency",
            "van phong",
            "office"
    );
    private static final Set<String> FOOD_SERVICE_KEYWORDS = Set.of(
            "clinic",
            "nha khoa",
            "dental",
            "spa",
            "salon",
            "barber",
            "massage",
            "service",
            "services",
            "dich vu"
    );
    private static final Set<String> FOOD_NON_FOOD_RETAIL_KEYWORDS = Set.of(
            "tinh dau",
            "dien thoai",
            "phone",
            "mobile",
            "xe may",
            "motorcycle",
            "o to",
            "car",
            "vat lieu",
            "noi that",
            "sat thep",
            "may tinh",
            "computer",
            "thuoc",
            "pharmacy",
            "sua chua",
            "repair"
    );
    private static final Set<String> GENERIC_FOOD_NAMES = Set.of(
            "quan an",
            "nha hang",
            "restaurant",
            "cafe",
            "ca phe",
            "coffee",
            "fast food",
            "food court",
            "quan cafe",
            "quan ca phe"
    );
    private static final TypeReference<Map<String, String>> RAW_TAGS_TYPE = new TypeReference<>() {
    };

    private static final Comparator<BackfillPreviewSample> SAMPLE_ORDER = Comparator
            .comparingInt(BackfillPreviewSample::predictedQualityScore)
            .thenComparingLong(BackfillPreviewSample::placeId);

    private final PlaceImportJdbcRepository placeImportJdbcRepository;
    private final PlaceModerationEvaluator placeModerationEvaluator;
    private final ObjectMapper objectMapper;

    public OsmModerationBackfillDryRunService(
            PlaceImportJdbcRepository placeImportJdbcRepository,
            PlaceModerationEvaluator placeModerationEvaluator,
            ObjectMapper objectMapper
    ) {
        this.placeImportJdbcRepository = placeImportJdbcRepository;
        this.placeModerationEvaluator = placeModerationEvaluator;
        this.objectMapper = objectMapper;
    }

    public OsmModerationBackfillDryRunReport runDryRun(
            PlaceModerationBackfillScope scope,
            int scanLimit,
            int topLimit
    ) {
        return runBackfill(scope, scanLimit, topLimit, false);
    }

    @Transactional
    public OsmModerationBackfillDryRunReport runApply(
            PlaceModerationBackfillScope scope,
            int scanLimit,
            int topLimit
    ) {
        if (!OSM_GEOFABRIK_SOURCE.equals(scope.sourceName())) {
            throw new IllegalStateException("APPLY mode is restricted to source=OSM_GEOFABRIK");
        }
        return runBackfill(scope, scanLimit, topLimit, true);
    }

    public void validateExecutionMode(PlaceModerationBackfillMode mode, boolean apply) {
        if (mode == PlaceModerationBackfillMode.APPLY && !apply) {
            throw new IllegalStateException("APPLY mode requires apply=true");
        }
        if (apply && mode != PlaceModerationBackfillMode.APPLY) {
            throw new IllegalStateException("apply=true requires mode=APPLY");
        }
    }

    private OsmModerationBackfillDryRunReport runBackfill(
            PlaceModerationBackfillScope scope,
            int scanLimit,
            int topLimit,
            boolean applyChanges
    ) {
        long totalSourceRecords = placeImportJdbcRepository.countPlacesForModerationBackfill(scope);
        Aggregation aggregation = new Aggregation(topLimit);
        List<PlaceImportJdbcRepository.ModerationUpdateCommand> pendingUpdates = new ArrayList<>();

        placeImportJdbcRepository.scanSourcePlacesForModerationBackfill(scope, scanLimit, sourceRecord -> {
            PlaceImportRecord importRecord = toImportRecord(sourceRecord);
            PlaceModerationPreview preview = evaluateBackfillPreview(importRecord);
            aggregation.accept(sourceRecord, preview);

            if (!applyChanges || !scope.sourceName().equals(sourceRecord.source())) {
                return;
            }

            pendingUpdates.add(new PlaceImportJdbcRepository.ModerationUpdateCommand(
                    sourceRecord.id(),
                    preview.placeType().name(),
                    preview.qualityScore(),
                    preview.verificationStatus().name(),
                    preview.recommendable(),
                    preview.rejectReason()
            ));

            if (pendingUpdates.size() >= 500) {
                aggregation.markUpdated(
                        placeImportJdbcRepository.updatePlaceModerationBatch(scope.sourceName(), List.copyOf(pendingUpdates))
                );
                pendingUpdates.clear();
            }
        });

        if (applyChanges && !pendingUpdates.isEmpty()) {
            aggregation.markUpdated(
                    placeImportJdbcRepository.updatePlaceModerationBatch(scope.sourceName(), List.copyOf(pendingUpdates))
            );
        }

        return aggregation.toReport(
                scope,
                totalSourceRecords,
                applyChanges ? PlaceModerationBackfillMode.APPLY.name() : PlaceModerationBackfillMode.DRY_RUN.name(),
                !applyChanges,
                OSM_GEOFABRIK_SOURCE.equals(scope.sourceName()),
                aggregation.updatedCount
        );
    }

    public String formatReport(OsmModerationBackfillDryRunReport report) {
        StringBuilder builder = new StringBuilder();
        builder.append("=== OSM MODERATION BACKFILL REPORT ===\n");
        builder.append("executionMode=").append(report.executionMode()).append('\n');
        builder.append("source=").append(report.sourceName()).append('\n');
        builder.append("scopeProvince=").append(report.scopeProvince()).append('\n');
        builder.append("scopeCity=").append(report.scopeCity()).append('\n');
        builder.append("scopeCurrentPlaceType=").append(report.scopeCurrentPlaceType()).append('\n');
        builder.append("scopeCurrentVerificationStatus=").append(report.scopeCurrentVerificationStatus()).append('\n');
        builder.append("scopeCurrentRecommendable=").append(report.scopeCurrentRecommendable()).append('\n');
        builder.append("scopeKnownLocationOnly=").append(report.scopeKnownLocationOnly()).append('\n');
        builder.append("sourceScopeConfirmed=").append(report.sourceScopeConfirmed()).append('\n');
        builder.append("totalSourceRecords=").append(report.totalSourceRecords()).append('\n');
        builder.append("checkedRecords=").append(report.checkedRecords()).append('\n');
        builder.append("updatedCount=").append(report.updatedCount()).append('\n');
        builder.append("wouldAutoApproved=").append(report.wouldAutoApproved()).append('\n');
        builder.append("wouldPending=").append(report.wouldPending()).append('\n');
        builder.append("wouldRejected=").append(report.wouldRejected()).append('\n');
        builder.append("wouldAttraction=").append(report.wouldAttraction()).append('\n');
        builder.append("wouldFood=").append(report.wouldFood()).append('\n');
        builder.append("wouldHotel=").append(report.wouldHotel()).append('\n');
        builder.append("wouldService=").append(report.wouldService()).append('\n');
        builder.append("recommendableCount=").append(report.recommendableCount()).append('\n');
        builder.append("noDbUpdateExecuted=").append(report.noDbUpdateExecuted()).append('\n');

        appendCountSection(builder, "countByPromotionGuardReason", report.countByPromotionGuardReason());
        appendCountSection(builder, "countByRejectReason", report.countByRejectReason());
        appendSampleSection(builder, "topWouldAutoApproved", report.topWouldAutoApproved());
        appendSampleSection(builder, "topWouldPendingDueToGuard", report.topWouldPendingDueToGuard());
        appendSampleSection(builder, "topWouldRejected", report.topWouldRejected());
        return builder.toString();
    }

    public void writeReportJson(Path outputPath, OsmModerationBackfillDryRunReport report) {
        try {
            Path parent = outputPath.toAbsolutePath().normalize().getParent();
            if (parent != null) {
                Files.createDirectories(parent);
            }
            String payload = objectMapper.copy()
                    .enable(SerializationFeature.INDENT_OUTPUT)
                    .writeValueAsString(report);
            Files.writeString(outputPath, payload, StandardCharsets.UTF_8);
        } catch (IOException exception) {
            throw new IllegalStateException("Failed to write dry-run moderation report JSON to " + outputPath, exception);
        }
    }

    private void appendCountSection(StringBuilder builder, String title, Map<String, Long> values) {
        builder.append(title).append(":\n");
        if (values.isEmpty()) {
            builder.append("  - none\n");
            return;
        }
        values.forEach((key, count) -> builder.append("  - ")
                .append(key)
                .append(": ")
                .append(count)
                .append('\n'));
    }

    private void appendSampleSection(StringBuilder builder, String title, List<BackfillPreviewSample> samples) {
        builder.append(title).append(":\n");
        if (samples.isEmpty()) {
            builder.append("  - none\n");
            return;
        }
        for (BackfillPreviewSample sample : samples) {
            builder.append("  - id=").append(sample.placeId())
                    .append(", sourceExternalId=").append(sample.sourceExternalId())
                    .append(", name=").append(sample.name())
                    .append(", predictedPlaceType=").append(sample.predictedPlaceType())
                    .append(", predictedQualityScore=").append(sample.predictedQualityScore())
                    .append(", predictedVerificationStatus=").append(sample.predictedVerificationStatus())
                    .append(", predictedRecommendable=").append(sample.predictedRecommendable());

            if (sample.rejectReason() != null) {
                builder.append(", rejectReason=").append(sample.rejectReason());
            }
            if (sample.promotionGuardReason() != null) {
                builder.append(", promotionGuardReason=").append(sample.promotionGuardReason());
            }
            builder.append('\n');
        }
    }

    private PlaceImportRecord toImportRecord(PlaceImportJdbcRepository.BackfillSourcePlaceRecord sourceRecord) {
        return new PlaceImportRecord(
                sourceRecord.sourceExternalId(),
                sourceRecord.name(),
                sourceRecord.province(),
                normalizeBackfillCity(sourceRecord.city()),
                sourceRecord.district(),
                sourceRecord.ward(),
                sourceRecord.displayAddress(),
                null,
                sourceRecord.latitude(),
                sourceRecord.longitude(),
                sourceRecord.description(),
                null,
                sourceRecord.durationMinutes(),
                sourceRecord.indoor(),
                sourceRecord.active(),
                sourceRecord.priceLevel(),
                sourceRecord.verificationStatus(),
                Set.of(),
                deserializeRawTags(sourceRecord.rawTagsJson())
        );
    }

    private String normalizeBackfillCity(String city) {
        if (city == null || city.isBlank()) {
            return null;
        }
        return "unknown".equalsIgnoreCase(city.trim()) ? null : city.trim();
    }

    private PlaceModerationPreview evaluateBackfillPreview(PlaceImportRecord importRecord) {
        PlaceModerationPreview preview = placeModerationEvaluator.evaluate(importRecord);
        if (preview.placeType() != PlaceType.FOOD) {
            return preview;
        }

        String amenity = normalizedTag(importRecord.rawTags(), "amenity");
        if (!FOOD_AUTO_APPROVE_AMENITIES.contains(amenity)) {
            return preview;
        }

        if (preview.qualityScore() < FOOD_AUTO_APPROVE_MIN_QUALITY_SCORE) {
            return preview;
        }

        String foodGuardReason = evaluateFoodAutoApproveGuard(importRecord);
        if (foodGuardReason != null) {
            return new PlaceModerationPreview(
                    preview.placeType(),
                    preview.normalizedCategory(),
                    preview.qualityScore(),
                    preview.tourismRelevanceScore(),
                    preview.completenessScore(),
                    preview.strongTourismSignal(),
                    VerificationStatus.PENDING,
                    false,
                    null,
                    foodGuardReason
            );
        }

        VerificationStatus promotedStatus = preview.verificationStatus() == VerificationStatus.VERIFIED
                ? VerificationStatus.VERIFIED
                : VerificationStatus.AUTO_APPROVED;

        return new PlaceModerationPreview(
                preview.placeType(),
                preview.normalizedCategory(),
                preview.qualityScore(),
                preview.tourismRelevanceScore(),
                preview.completenessScore(),
                preview.strongTourismSignal(),
                promotedStatus,
                true,
                null,
                null
        );
    }

    private String normalizedTag(Map<String, String> rawTags, String key) {
        if (rawTags == null || rawTags.isEmpty()) {
            return null;
        }
        String value = rawTags.get(key);
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim().toLowerCase(Locale.ROOT);
    }

    private String evaluateFoodAutoApproveGuard(PlaceImportRecord importRecord) {
        if (invalidCoordinates(importRecord.latitude(), importRecord.longitude())) {
            return "Invalid location for FOOD auto-approve";
        }

        String normalizedName = normalizeForComparison(importRecord.name());
        if (normalizedName.isBlank()) {
            return "Generic food name";
        }

        if (GENERIC_FOOD_NAMES.contains(normalizedName)) {
            return "Generic food name";
        }

        String businessKeyword = firstMatchingKeyword(normalizedName, FOOD_BUSINESS_KEYWORDS);
        if (businessKeyword != null) {
            return "Business-like keyword in FOOD name: " + businessKeyword;
        }

        String serviceKeyword = firstMatchingKeyword(normalizedName, FOOD_SERVICE_KEYWORDS);
        if (serviceKeyword != null) {
            return "Non-food service keyword in FOOD name: " + serviceKeyword;
        }

        String retailKeyword = firstMatchingKeyword(normalizedName, FOOD_NON_FOOD_RETAIL_KEYWORDS);
        if (retailKeyword != null) {
            return "Non-food retail keyword in FOOD name: " + retailKeyword;
        }

        return null;
    }

    private String firstMatchingKeyword(String normalizedName, Set<String> keywords) {
        return keywords.stream()
                .sorted()
                .filter(keyword -> containsWholePhrase(normalizedName, keyword))
                .findFirst()
                .orElse(null);
    }

    private boolean containsWholePhrase(String normalizedName, String keyword) {
        String escapedKeyword = Pattern.quote(keyword);
        Pattern pattern = Pattern.compile("(^|[^\\p{L}\\p{Nd}])" + escapedKeyword + "([^\\p{L}\\p{Nd}]|$)");
        return pattern.matcher(normalizedName).find();
    }

    private boolean invalidCoordinates(Double latitude, Double longitude) {
        return latitude == null
                || longitude == null
                || latitude < -90
                || latitude > 90
                || longitude < -180
                || longitude > 180;
    }

    private String normalizeForComparison(String value) {
        if (value == null) {
            return "";
        }
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        return normalized
                .replace('"', ' ')
                .replace('“', ' ')
                .replace('”', ' ')
                .trim()
                .toLowerCase(Locale.ROOT)
                .replaceAll("\\s+", " ");
    }

    private Map<String, String> deserializeRawTags(String rawTagsJson) {
        if (rawTagsJson == null || rawTagsJson.isBlank()) {
            return Map.of();
        }

        try {
            Map<String, String> rawTags = objectMapper.readValue(rawTagsJson, RAW_TAGS_TYPE);
            return rawTags == null ? Map.of() : rawTags;
        } catch (IOException exception) {
            throw new IllegalStateException("Failed to deserialize raw_tags JSON for moderation backfill", exception);
        }
    }

    private static final class Aggregation {
        private final TopCollector autoApprovedCollector;
        private final TopCollector pendingDueToGuardCollector;
        private final TopCollector rejectedCollector;
        private final Map<String, Long> countByPromotionGuardReason = new LinkedHashMap<>();
        private final Map<String, Long> countByRejectReason = new LinkedHashMap<>();
        private final List<BackfillEvaluatedRecord> evaluatedRecords = new ArrayList<>();
        private long checkedRecords;
        private long wouldAutoApproved;
        private long wouldPending;
        private long wouldRejected;
        private long wouldAttraction;
        private long wouldFood;
        private long wouldHotel;
        private long wouldService;
        private long recommendableCount;
        private long updatedCount;

        private Aggregation(int topLimit) {
            this.autoApprovedCollector = new TopCollector(topLimit);
            this.pendingDueToGuardCollector = new TopCollector(topLimit);
            this.rejectedCollector = new TopCollector(topLimit);
        }

        private void accept(
                PlaceImportJdbcRepository.BackfillSourcePlaceRecord sourceRecord,
                PlaceModerationPreview preview
        ) {
            checkedRecords++;
            incrementPlaceType(preview.placeType());
            if (preview.recommendable()) {
                recommendableCount++;
            }

            if (preview.promotionGuardReason() != null) {
                countByPromotionGuardReason.merge(preview.promotionGuardReason(), 1L, Long::sum);
            }
            if (preview.rejectReason() != null) {
                countByRejectReason.merge(preview.rejectReason(), 1L, Long::sum);
            }

            BackfillPreviewSample sample = new BackfillPreviewSample(
                    sourceRecord.id(),
                    sourceRecord.sourceExternalId(),
                    sourceRecord.name(),
                    sourceRecord.province(),
                    sourceRecord.city(),
                    normalizeEnum(sourceRecord.currentPlaceType()),
                    normalizeEnum(sourceRecord.verificationStatus()),
                    Boolean.TRUE.equals(sourceRecord.currentRecommendable()),
                    preview.placeType().name(),
                    preview.qualityScore(),
                    preview.verificationStatus().name(),
                    preview.recommendable(),
                    preview.rejectReason(),
                    preview.promotionGuardReason()
            );
            evaluatedRecords.add(toEvaluatedRecord(sourceRecord, preview, sample));

            if (preview.verificationStatus() == VerificationStatus.AUTO_APPROVED) {
                wouldAutoApproved++;
                autoApprovedCollector.add(sample);
                return;
            }

            if (preview.verificationStatus() == VerificationStatus.REJECTED) {
                wouldRejected++;
                rejectedCollector.add(sample);
                return;
            }

            wouldPending++;
            if (preview.promotionGuardReason() != null) {
                pendingDueToGuardCollector.add(sample);
            }
        }

        private void incrementPlaceType(PlaceType placeType) {
            switch (placeType) {
                case ATTRACTION -> wouldAttraction++;
                case FOOD -> wouldFood++;
                case HOTEL -> wouldHotel++;
                case SERVICE -> wouldService++;
                case REJECTED -> {
                }
            }
        }

        private void markUpdated(int rows) {
            updatedCount += rows;
        }

        private OsmModerationBackfillDryRunReport toReport(
                PlaceModerationBackfillScope scope,
                long totalSourceRecords,
                String executionMode,
                boolean noDbUpdateExecuted,
                boolean sourceScopeConfirmed,
                long updatedCount
        ) {
            return new OsmModerationBackfillDryRunReport(
                    executionMode,
                    scope.sourceName(),
                    scope.province(),
                    scope.city(),
                    normalizeEnum(scope.currentPlaceType()),
                    normalizeEnum(scope.currentVerificationStatus()),
                    scope.currentRecommendable(),
                    scope.knownLocationOnly(),
                    sourceScopeConfirmed,
                    totalSourceRecords,
                    checkedRecords,
                    updatedCount,
                    wouldAutoApproved,
                    wouldPending,
                    wouldRejected,
                    wouldAttraction,
                    wouldFood,
                    wouldHotel,
                    wouldService,
                    recommendableCount,
                    sortCounts(countByPromotionGuardReason),
                    sortCounts(countByRejectReason),
                    autoApprovedCollector.toSortedList(),
                    pendingDueToGuardCollector.toSortedList(),
                    rejectedCollector.toSortedList(),
                    evaluatedRecords,
                    noDbUpdateExecuted
            );
        }

        private BackfillEvaluatedRecord toEvaluatedRecord(
                PlaceImportJdbcRepository.BackfillSourcePlaceRecord sourceRecord,
                PlaceModerationPreview preview,
                BackfillPreviewSample sample
        ) {
            return new BackfillEvaluatedRecord(
                    sample.placeId(),
                    sample.sourceExternalId(),
                    sample.name(),
                    sourceRecord.province(),
                    sourceRecord.city(),
                    sourceRecord.district(),
                    sourceRecord.ward(),
                    sourceRecord.displayAddress(),
                    sourceRecord.description(),
                    sourceRecord.tags(),
                    sourceRecord.rawTagsJson(),
                    sourceRecord.currentPlaceType(),
                    sourceRecord.verificationStatus(),
                    sourceRecord.currentQualityScore(),
                    Boolean.TRUE.equals(sourceRecord.currentRecommendable()),
                    sourceRecord.currentRejectReason(),
                    preview.normalizedCategory(),
                    preview.tourismRelevanceScore(),
                    preview.completenessScore(),
                    preview.strongTourismSignal(),
                    sample.predictedPlaceType(),
                    sample.predictedQualityScore(),
                    sample.predictedVerificationStatus(),
                    sample.predictedRecommendable(),
                    sample.rejectReason(),
                    sample.promotionGuardReason()
            );
        }

        private Map<String, Long> sortCounts(Map<String, Long> source) {
            return source.entrySet().stream()
                    .sorted(Map.Entry.<String, Long>comparingByValue().reversed()
                            .thenComparing(Map.Entry.comparingByKey()))
                    .collect(LinkedHashMap::new, (map, entry) -> map.put(entry.getKey(), entry.getValue()), Map::putAll);
        }
    }

    private static final class TopCollector {
        private final int limit;
        private final PriorityQueue<BackfillPreviewSample> queue = new PriorityQueue<>(SAMPLE_ORDER);

        private TopCollector(int limit) {
            this.limit = limit;
        }

        private void add(BackfillPreviewSample sample) {
            if (limit <= 0) {
                return;
            }
            if (queue.size() < limit) {
                queue.add(sample);
                return;
            }
            BackfillPreviewSample weakest = queue.peek();
            if (weakest != null && SAMPLE_ORDER.compare(sample, weakest) > 0) {
                queue.poll();
                queue.add(sample);
            }
        }

        private List<BackfillPreviewSample> toSortedList() {
            List<BackfillPreviewSample> samples = new ArrayList<>(queue);
            samples.sort(SAMPLE_ORDER.reversed());
            return samples;
        }
    }

    private static String normalizeEnum(String value) {
        return value == null || value.isBlank() ? null : value.trim().toUpperCase(Locale.ROOT);
    }

    public record OsmModerationBackfillDryRunReport(
            String executionMode,
            String sourceName,
            String scopeProvince,
            String scopeCity,
            String scopeCurrentPlaceType,
            String scopeCurrentVerificationStatus,
            Boolean scopeCurrentRecommendable,
            boolean scopeKnownLocationOnly,
            boolean sourceScopeConfirmed,
            long totalSourceRecords,
            long checkedRecords,
            long updatedCount,
            long wouldAutoApproved,
            long wouldPending,
            long wouldRejected,
            long wouldAttraction,
            long wouldFood,
            long wouldHotel,
            long wouldService,
            long recommendableCount,
            Map<String, Long> countByPromotionGuardReason,
            Map<String, Long> countByRejectReason,
            List<BackfillPreviewSample> topWouldAutoApproved,
            List<BackfillPreviewSample> topWouldPendingDueToGuard,
            List<BackfillPreviewSample> topWouldRejected,
            List<BackfillEvaluatedRecord> evaluatedRecords,
            boolean noDbUpdateExecuted
    ) {
    }

    public record BackfillPreviewSample(
            long placeId,
            String sourceExternalId,
            String name,
            String province,
            String city,
            String currentPlaceType,
            String currentVerificationStatus,
            boolean currentRecommendable,
            String predictedPlaceType,
            int predictedQualityScore,
            String predictedVerificationStatus,
            boolean predictedRecommendable,
            String rejectReason,
            String promotionGuardReason
    ) {
    }

    public record BackfillEvaluatedRecord(
            long placeId,
            String sourceExternalId,
            String name,
            String province,
            String city,
            String district,
            String ward,
            String displayAddress,
            String description,
            Set<String> tags,
            String rawTagsJson,
            String currentPlaceType,
            String currentVerificationStatus,
            Integer currentQualityScore,
            boolean currentRecommendable,
            String currentRejectReason,
            String normalizedCategory,
            int tourismRelevanceScore,
            int completenessScore,
            boolean strongTourismSignal,
            String predictedPlaceType,
            int predictedQualityScore,
            String predictedVerificationStatus,
            boolean predictedRecommendable,
            String rejectReason,
            String promotionGuardReason
    ) {
    }
}
