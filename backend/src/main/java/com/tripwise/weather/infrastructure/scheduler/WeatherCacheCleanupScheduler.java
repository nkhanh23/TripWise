package com.tripwise.weather.infrastructure.scheduler;

import com.tripwise.weather.domain.repository.WeatherCacheRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;

/**
 * Scheduled cron task to periodically clean up expired weather cache records.
 * Runs daily at 2:00 AM to prevent database bloat.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class WeatherCacheCleanupScheduler {

    private final WeatherCacheRepository weatherCacheRepository;

    /**
     * Delete weather cache database records whose expiresAt is in the past.
     * Scheduled for daily execution at 02:00:00.
     */
    @Scheduled(cron = "0 0 2 * * ?")
    public void cleanupExpiredForecasts() {
        log.info("Starting scheduled cleanup of expired weather cache records...");
        try {
            Instant now = Instant.now();
            weatherCacheRepository.deleteExpiredForecasts(now);
            log.info("Successfully cleaned up expired weather cache records.");
        } catch (Exception e) {
            log.error("Failed to clean up expired weather cache records: {}", e.getMessage(), e);
        }
    }
}
