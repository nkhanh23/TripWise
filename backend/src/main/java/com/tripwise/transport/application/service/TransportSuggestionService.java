package com.tripwise.transport.application.service;

import com.tripwise.transport.application.dto.TransportSuggestionResponse;
import org.springframework.stereotype.Service;

@Service
public class TransportSuggestionService {

    private static final int WALK_MAX_DISTANCE_METERS = 1_000;
    private static final int TAXI_MAX_DISTANCE_METERS = 10_000;

    public TransportSuggestionResponse suggest(Integer distanceMeters) {
        if (distanceMeters == null || distanceMeters <= 0) {
            return null;
        }

        if (distanceMeters < WALK_MAX_DISTANCE_METERS) {
            return TransportSuggestionResponse.builder()
                    .mode("WALK")
                    .reason("Quang duong ngan, phu hop de di bo.")
                    .build();
        }

        if (distanceMeters < TAXI_MAX_DISTANCE_METERS) {
            return TransportSuggestionResponse.builder()
                    .mode("TAXI")
                    .reason("Quang duong tam trung, taxi thuan tien hon trong thanh pho.")
                    .build();
        }

        return TransportSuggestionResponse.builder()
                .mode("BUS")
                .reason("Quang duong dai hon, uu tien phuong an tiet kiem chi phi.")
                .build();
    }
}
