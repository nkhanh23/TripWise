package com.tripwise.place.infrastructure.ingestion;

import com.tripwise.place.application.service.PlaceImportService;
import com.tripwise.place.infrastructure.config.PlaceImportProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.nio.file.Files;
import java.nio.file.Path;

@Slf4j
@Component
@RequiredArgsConstructor
public class PlaceImportRunner implements ApplicationRunner {

    private final PlaceImportProperties placeImportProperties;
    private final PlaceImportService placeImportService;

    @Override
    public void run(ApplicationArguments args) throws Exception {
        if (!placeImportProperties.isEnabled()) {
            return;
        }

        String inputFile = placeImportProperties.getInputFile();
        if (inputFile == null || inputFile.isBlank()) {
            throw new IllegalStateException("tripwise.place-import.input-file must be configured when import is enabled");
        }

        Path importFile = Path.of(inputFile).toAbsolutePath().normalize();
        if (!Files.exists(importFile)) {
            throw new IllegalStateException("Place import file does not exist: " + importFile);
        }

        log.info(
                "Starting place import from {} with source {} in {} mode",
                importFile,
                placeImportProperties.getSourceName(),
                placeImportProperties.getImportMode()
        );

        var report = placeImportService.importFile(
                importFile,
                placeImportProperties.getSourceName(),
                placeImportProperties.getImportMode(),
                placeImportProperties.getDedupeRadiusMeters(),
                placeImportProperties.isFailOnMappingError()
        );

        log.info(
                "Finished place import run {}. processed={}, inserted={}, updated={}, deduplicated={}, skipped={}, errors={}, stale={}",
                report.runId(),
                report.processedCount(),
                report.insertedCount(),
                report.updatedCount(),
                report.deduplicatedCount(),
                report.skippedCount(),
                report.errorCount(),
                report.staleMarkedCount()
        );
    }
}
