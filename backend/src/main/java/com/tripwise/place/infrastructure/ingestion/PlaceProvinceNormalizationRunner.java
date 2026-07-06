package com.tripwise.place.infrastructure.ingestion;

import com.tripwise.place.application.service.PlaceProvinceNormalizationService;
import com.tripwise.place.infrastructure.config.PlaceModerationBackfillMode;
import com.tripwise.place.infrastructure.config.PlaceProvinceNormalizationProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.nio.file.Path;

@Slf4j
@Component
@RequiredArgsConstructor
public class PlaceProvinceNormalizationRunner implements ApplicationRunner {

    private final PlaceProvinceNormalizationProperties properties;
    private final PlaceProvinceNormalizationService normalizationService;

    @Override
    public void run(ApplicationArguments args) {
        if (!properties.isEnabled()) {
            return;
        }

        if (properties.getMode() == PlaceModerationBackfillMode.APPLY && !properties.isApply()) {
            throw new IllegalStateException("APPLY mode requires apply=true");
        }
        if (properties.isApply() && properties.getMode() != PlaceModerationBackfillMode.APPLY) {
            throw new IllegalStateException("apply=true requires mode=APPLY");
        }

        PlaceProvinceNormalizationService.ProvinceNormalizationReport report;

        if (properties.getMode() == PlaceModerationBackfillMode.APPLY) {
            report = normalizationService.runApply(
                    properties.getSourceName(),
                    properties.getSampleLimit()
            );
        } else {
            report = normalizationService.runDryRun(
                    properties.getSourceName(),
                    properties.getSampleLimit()
            );
        }

        if (properties.getExportJsonFile() != null && !properties.getExportJsonFile().isBlank()) {
            Path exportPath = Path.of(properties.getExportJsonFile()).toAbsolutePath().normalize();
            normalizationService.writeReportJson(exportPath, report);
        }

        log.info("\n{}", normalizationService.formatReport(report));
    }
}
