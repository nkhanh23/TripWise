package com.tripwise.trip.presentation;

import com.tripwise.common.api.ApiResponse;
import com.tripwise.common.api.PageResponse;
import com.tripwise.itinerary.application.dto.GeneratedItineraryResponse;
import com.tripwise.itinerary.application.service.GenerateItineraryUseCase;
import com.tripwise.trip.application.dto.CreateTripRequest;
import com.tripwise.trip.application.dto.TripDetailResponse;
import com.tripwise.trip.application.dto.TripResponse;
import com.tripwise.trip.application.service.DeleteTripUseCase;
import com.tripwise.trip.application.service.GetTripDetailUseCase;
import com.tripwise.trip.application.service.ListUserTripsUseCase;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/trips")
@RequiredArgsConstructor
public class TripController {

    private static final int DEFAULT_PAGE = 0;
    private static final int DEFAULT_SIZE = 20;
    private static final int MAX_PAGE_SIZE = 100;

    private final GenerateItineraryUseCase generateItineraryUseCase;
    private final ListUserTripsUseCase listUserTripsUseCase;
    private final GetTripDetailUseCase getTripDetailUseCase;
    private final DeleteTripUseCase deleteTripUseCase;

    @PostMapping("/generate")
    public ResponseEntity<ApiResponse<GeneratedItineraryResponse>> generateTrip(
            @Valid @RequestBody CreateTripRequest request,
            Authentication authentication) {
        GeneratedItineraryResponse response = generateItineraryUseCase.execute(authentication.getName(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Lên lịch trình thành công", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<TripResponse>>> getMyTrips(
            @RequestParam(defaultValue = "0") Integer page,
            @RequestParam(defaultValue = "20") Integer size,
            Authentication authentication) {
        PageRequest pageRequest = PageRequest.of(
                normalizePage(page),
                normalizeSize(size),
                Sort.by(Sort.Direction.DESC, "createdAt")
        );
        PageResponse<TripResponse> response = PageResponse.of(
                listUserTripsUseCase.execute(authentication.getName(), pageRequest)
        );
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách chuyến đi thành công", response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<TripDetailResponse>> getTripDetail(
            @PathVariable Long id,
            Authentication authentication) {
        TripDetailResponse response = getTripDetailUseCase.execute(authentication.getName(), id);
        return ResponseEntity.ok(ApiResponse.success("Lấy chi tiết chuyến đi thành công", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteTrip(
            @PathVariable Long id,
            Authentication authentication) {
        deleteTripUseCase.execute(authentication.getName(), id);
        return ResponseEntity.ok(ApiResponse.success("Xóa chuyến đi thành công", null));
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
}
