package com.tripwise.place.application.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tripwise.place.application.dto.PlaceImportMode;
import com.tripwise.place.application.dto.PlaceImportRecord;
import com.tripwise.place.application.dto.PlaceImportReport;
import com.tripwise.place.domain.entity.PlaceCategory;
import com.tripwise.place.domain.model.VerificationStatus;
import com.tripwise.place.infrastructure.ingestion.OsmPlaceFilterResult;
import com.tripwise.place.infrastructure.ingestion.PlaceImportFileReader;
import com.tripwise.place.infrastructure.persistence.PlaceImportJdbcRepository;
import com.tripwise.place.infrastructure.persistence.repository.PlaceCategoryRepository;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.nio.file.Path;
import java.text.Normalizer;
import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.StringJoiner;
import java.util.stream.Collectors;

@Service
public class PlaceImportService {

    private final ObjectProvider<PlaceCategoryRepository> placeCategoryRepositoryProvider;
    private final ObjectProvider<PlaceImportJdbcRepository> placeImportJdbcRepositoryProvider;
    private final PlaceImportFileReader placeImportFileReader;
    private final PlaceModerationEvaluator placeModerationEvaluator;
    private final ObjectMapper objectMapper;

    public PlaceImportService(
            ObjectProvider<PlaceCategoryRepository> placeCategoryRepositoryProvider,
            ObjectProvider<PlaceImportJdbcRepository> placeImportJdbcRepositoryProvider,
            PlaceImportFileReader placeImportFileReader,
            PlaceModerationEvaluator placeModerationEvaluator,
            ObjectMapper objectMapper
    ) {
        this.placeCategoryRepositoryProvider = placeCategoryRepositoryProvider;
        this.placeImportJdbcRepositoryProvider = placeImportJdbcRepositoryProvider;
        this.placeImportFileReader = placeImportFileReader;
        this.placeModerationEvaluator = placeModerationEvaluator;
        this.objectMapper = objectMapper;
    }

    public PlaceImportReport importFile(
            Path inputFile,
            String sourceName,
            PlaceImportMode importMode,
            double dedupeRadiusMeters,
            boolean failOnMappingError
    ) {
        PlaceCategoryRepository placeCategoryRepository = requirePlaceCategoryRepository();
        Map<String, Long> categoryIdsBySlug = placeCategoryRepository.findAllByOrderByNameAsc().stream()
                .collect(Collectors.toMap(PlaceCategory::getSlug, PlaceCategory::getId));
        PlaceImportJdbcRepository placeImportJdbcRepository = requireImportJdbcRepository();

        Instant startedAt = Instant.now();
        long runId = placeImportJdbcRepository.createImportRun(
                sourceName,
                inputFile.toAbsolutePath().toString(),
                importMode.name(),
                startedAt
        );

        ImportCounters counters = new ImportCounters();
        StringJoiner notes = new StringJoiner(" | ");

        try {
            if (importMode == PlaceImportMode.FULL_SYNC) {
                placeImportJdbcRepository.markSourceRowsPendingStale(sourceName, startedAt);
            }

            placeImportFileReader.read(inputFile, record -> processRecord(
                    record,
                    sourceName,
                    dedupeRadiusMeters,
                    failOnMappingError,
                    categoryIdsBySlug,
                    startedAt,
                    counters,
                    notes
            ));

            if (importMode == PlaceImportMode.FULL_SYNC) {
                counters.staleMarkedCount = placeImportJdbcRepository.deactivateStaleRows(sourceName, startedAt);
            }

            placeImportJdbcRepository.completeImportRun(
                    runId,
                    "SUCCESS",
                    counters.processedCount,
                    counters.insertedCount,
                    counters.updatedCount,
                    counters.deduplicatedCount,
                    counters.skippedCount,
                    counters.errorCount,
                    counters.staleMarkedCount,
                    summarizedNotes(notes),
                    Instant.now()
            );

            return new PlaceImportReport(
                    runId,
                    counters.processedCount,
                    counters.insertedCount,
                    counters.updatedCount,
                    counters.deduplicatedCount,
                    counters.skippedCount,
                    counters.errorCount,
                    counters.staleMarkedCount,
                    summarizedNotes(notes)
            );
        } catch (Exception exception) {
            if (importMode == PlaceImportMode.FULL_SYNC) {
                placeImportJdbcRepository.clearPendingStaleMarker(sourceName, startedAt);
            }

            notes.add("Import failed: " + exception.getMessage());
            placeImportJdbcRepository.completeImportRun(
                    runId,
                    "FAILED",
                    counters.processedCount,
                    counters.insertedCount,
                    counters.updatedCount,
                    counters.deduplicatedCount,
                    counters.skippedCount,
                    counters.errorCount,
                    counters.staleMarkedCount,
                    summarizedNotes(notes),
                    Instant.now()
            );

            throw new IllegalStateException("Place import failed for file " + inputFile, exception);
        }
    }

    private void processRecord(
            PlaceImportRecord record,
            String sourceName,
            double dedupeRadiusMeters,
            boolean failOnMappingError,
            Map<String, Long> categoryIdsBySlug,
            Instant syncedAt,
            ImportCounters counters,
            StringJoiner notes
    ) {
        PlaceImportJdbcRepository placeImportJdbcRepository = requireImportJdbcRepository();
        counters.processedCount++;

        if (record.name() == null || record.name().isBlank() || record.latitude() == null || record.longitude() == null) {
            counters.skippedCount++;
            counters.errorCount++;
            appendLimited(notes, "Skipped invalid record without mandatory name/coordinates");
            return;
        }

        PlaceModerationPreview moderationPreview = placeModerationEvaluator.evaluate(record);
        if (moderationPreview.isRejectedByFilter()) {
            counters.skippedCount++;
            appendLimited(notes, "Rejected " + record.name() + ": " + moderationPreview.rejectReason());
            return;
        }

        String categorySlug = moderationPreview.normalizedCategory();
        Long categoryId = categorySlug == null ? null : categoryIdsBySlug.get(categorySlug);
        if (categoryId == null) {
            counters.skippedCount++;
            String message = "Unsupported normalized category " + categorySlug + " for " + record.name()
                    + " (" + moderationPreview.placeType() + ")";
            appendLimited(notes, message);
            if (failOnMappingError) {
                throw new IllegalStateException(message);
            }
            return;
        }

        VerificationStatus verificationStatus = moderationPreview.verificationStatus();
        boolean verified = verificationStatus == VerificationStatus.VERIFIED;
        boolean recommendable = moderationPreview.recommendable();
        boolean active = record.active() == null || record.active();
        boolean indoor = record.indoor() != null && record.indoor();
        int durationMinutes = record.durationMinutes() == null || record.durationMinutes() <= 0 ? 60 : record.durationMinutes();
        BigDecimal estimatedCost = record.estimatedCost() == null ? BigDecimal.ZERO : record.estimatedCost();
        String city = bestEffortCity(record);
        String rawTagsJson = serializeRawTags(record.rawTags());
        Set<String> placeTags = derivePlaceTags(record, categorySlug);
        String sourceReference = sourceReference(record);

        Optional<PlaceImportJdbcRepository.ExistingPlaceRecord> exactMatch = Optional.empty();
        if (record.sourceExternalId() != null && !record.sourceExternalId().isBlank()) {
            exactMatch = placeImportJdbcRepository.findBySourceAndExternalId(sourceName, record.sourceExternalId());
        }

        if (exactMatch.isPresent()) {
            placeImportJdbcRepository.updateSourceOwnedPlace(
                    exactMatch.get().id(),
                    record.sourceExternalId(),
                    record.name().trim(),
                    trimToNull(record.province()),
                    city,
                    trimToNull(record.district()),
                    trimToNull(record.ward()),
                    trimToNull(record.displayAddress()),
                    categoryId,
                    record.latitude(),
                    record.longitude(),
                    trimToNull(record.description()),
                    estimatedCost,
                    durationMinutes,
                    indoor,
                    active,
                    verified,
                    trimToNull(record.priceLevel()),
                    moderationPreview.placeType().name(),
                    moderationPreview.qualityScore(),
                    recommendable,
                    moderationPreview.rejectReason(),
                    rawTagsJson,
                    verificationStatus.name(),
                    syncedAt
            );
            placeImportJdbcRepository.replaceTags(exactMatch.get().id(), placeTags);
            placeImportJdbcRepository.upsertPlaceDataSource(
                    exactMatch.get().id(),
                    sourceName,
                    sourceReference,
                    verificationStatus.name(),
                    "Matched by source/source_external_id",
                    syncedAt
            );
            counters.updatedCount++;
            return;
        }

        Optional<PlaceImportJdbcRepository.ExistingPlaceRecord> fuzzyDuplicate = placeImportJdbcRepository.findDuplicateByNameAndLocation(
                record.name().trim(),
                trimToNull(record.province()),
                city,
                record.latitude(),
                record.longitude(),
                dedupeRadiusMeters
        );

        if (fuzzyDuplicate.isPresent()) {
            placeImportJdbcRepository.mergeIntoDuplicatePlace(
                    fuzzyDuplicate.get().id(),
                    trimToNull(record.province()),
                    city,
                    trimToNull(record.district()),
                    trimToNull(record.ward()),
                    trimToNull(record.displayAddress()),
                    trimToNull(record.description()),
                    estimatedCost,
                    durationMinutes,
                    indoor,
                    active,
                    trimToNull(record.priceLevel()),
                    moderationPreview.placeType().name(),
                    moderationPreview.qualityScore(),
                    recommendable,
                    moderationPreview.rejectReason(),
                    rawTagsJson,
                    verificationStatus.name(),
                    verified,
                    syncedAt
            );
            placeImportJdbcRepository.upsertPlaceDataSource(
                    fuzzyDuplicate.get().id(),
                    sourceName,
                    sourceReference,
                    verificationStatus.name(),
                    "Deduplicated by normalized name + nearby location",
                    syncedAt
            );
            counters.deduplicatedCount++;
            return;
        }

        long placeId = placeImportJdbcRepository.insertPlace(
                sourceName,
                trimToNull(record.sourceExternalId()),
                record.name().trim(),
                trimToNull(record.province()),
                city,
                trimToNull(record.district()),
                trimToNull(record.ward()),
                trimToNull(record.displayAddress()),
                categoryId,
                record.latitude(),
                record.longitude(),
                trimToNull(record.description()),
                estimatedCost,
                durationMinutes,
                indoor,
                active,
                verified,
                trimToNull(record.priceLevel()),
                moderationPreview.placeType().name(),
                moderationPreview.qualityScore(),
                recommendable,
                moderationPreview.rejectReason(),
                rawTagsJson,
                verificationStatus.name(),
                syncedAt
        );
        placeImportJdbcRepository.replaceTags(placeId, placeTags);
        placeImportJdbcRepository.upsertPlaceDataSource(
                placeId,
                sourceName,
                sourceReference,
                verificationStatus.name(),
                "Inserted from nationwide import",
                syncedAt
        );
        counters.insertedCount++;
    }

    private String bestEffortCity(PlaceImportRecord record) {
        if (hasText(record.city())) {
            return record.city().trim();
        }
        if (hasText(record.district())) {
            return record.district().trim();
        }
        if (hasText(record.province())) {
            return record.province().trim();
        }
        return "Unknown";
    }

    private String sourceReference(PlaceImportRecord record) {
        if (hasText(record.sourceExternalId())) {
            return record.sourceExternalId().trim();
        }

        return normalizeKey(record.name()) + ":" + roundCoordinate(record.latitude()) + ":" + roundCoordinate(record.longitude());
    }

    private String roundCoordinate(Double value) {
        if (value == null) {
            return "0";
        }
        return String.format(Locale.ROOT, "%.5f", value);
    }

    private Set<String> derivePlaceTags(PlaceImportRecord record, String categorySlug) {
        LinkedHashSet<String> tags = new LinkedHashSet<>();
        if (categorySlug != null) {
            tags.add(categorySlug);
        }

        if (record.tags() != null) {
            record.tags().stream()
                    .map(this::normalizeTag)
                    .filter(this::hasText)
                    .forEach(tags::add);
        }

        if (record.rawTags() != null) {
            List.of("tourism", "amenity", "leisure", "natural", "historic", "shop")
                    .forEach(key -> {
                        String value = record.rawTags().get(key);
                        String normalized = normalizeTag(value);
                        if (hasText(normalized)) {
                            tags.add(normalized);
                        }
                    });
        }
        return tags;
    }

    private String normalizeTag(String value) {
        if (!hasText(value)) {
            return null;
        }
        String base = Normalizer.normalize(value.trim(), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-|-$)", "");
        return base.isBlank() ? null : base;
    }

    private String normalizeKey(String value) {
        String normalized = normalizeTag(value);
        return normalized == null ? "place" : normalized;
    }

    private String serializeRawTags(Map<String, String> rawTags) {
        try {
            return objectMapper.writeValueAsString(rawTags == null ? Map.of() : rawTags);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Failed to serialize raw tags", exception);
        }
    }

    private void appendLimited(StringJoiner notes, String note) {
        if (notes.length() < 1500) {
            notes.add(note);
        }
    }

    private String summarizedNotes(StringJoiner notes) {
        String value = notes.toString();
        return value.isBlank() ? null : value;
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private String trimToNull(String value) {
        return hasText(value) ? value.trim() : null;
    }

    private static final class ImportCounters {
        private int processedCount;
        private int insertedCount;
        private int updatedCount;
        private int deduplicatedCount;
        private int skippedCount;
        private int errorCount;
        private int staleMarkedCount;
    }
    private PlaceCategoryRepository requirePlaceCategoryRepository() {
        PlaceCategoryRepository repository = placeCategoryRepositoryProvider.getIfAvailable();
        if (repository == null) {
            throw new IllegalStateException("Place import requires PlaceCategoryRepository with JPA enabled");
        }
        return repository;
    }

    private PlaceImportJdbcRepository requireImportJdbcRepository() {
        PlaceImportJdbcRepository repository = placeImportJdbcRepositoryProvider.getIfAvailable();
        if (repository == null) {
            throw new IllegalStateException("Place import requires JdbcTemplate and database infrastructure");
        }
        return repository;
    }
}
