package com.tripwise.place.infrastructure.ingestion;

import com.tripwise.place.application.dto.PlaceModerationBackfillScope;
import com.tripwise.place.application.service.OsmModerationBackfillDryRunService;
import com.tripwise.place.infrastructure.config.PlaceModerationBackfillMode;
import com.tripwise.place.infrastructure.config.PlaceModerationBackfillProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.nio.file.Path;

@Slf4j
@Component
@RequiredArgsConstructor
public class PlaceModerationBackfillRunner implements ApplicationRunner {

    private final PlaceModerationBackfillProperties properties;
    private final OsmModerationBackfillDryRunService dryRunService;

    @Override
    public void run(ApplicationArguments args) {
        if (!properties.isEnabled()) {
            return;
        }

        dryRunService.validateExecutionMode(properties.getMode(), properties.isApply());

        PlaceModerationBackfillScope scope = PlaceModerationBackfillScope.builder()
                .sourceName(properties.getSourceName())
                .province(properties.getProvince())
                .city(properties.getCity())
                .currentPlaceType(properties.getCurrentPlaceType())
                .currentVerificationStatus(properties.getCurrentVerificationStatus())
                .currentRecommendable(properties.getCurrentRecommendable())
                .build();

        var report = properties.getMode() == PlaceModerationBackfillMode.APPLY
                ? dryRunService.runApply(
                scope,
                properties.getScanLimit(),
                properties.getTopLimit()
        )
                : dryRunService.runDryRun(
                scope,
                properties.getScanLimit(),
                properties.getTopLimit()
        );

        if (properties.getExportJsonFile() != null && !properties.getExportJsonFile().isBlank()) {
            Path exportPath = Path.of(properties.getExportJsonFile()).toAbsolutePath().normalize();
            dryRunService.writeReportJson(exportPath, report);
            log.info("Wrote moderation backfill report JSON to {}", exportPath);
        }

        log.info("\n{}", dryRunService.formatReport(report));
    }
}
