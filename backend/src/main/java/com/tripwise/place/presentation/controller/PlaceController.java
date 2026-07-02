package com.tripwise.place.presentation.controller;

import com.tripwise.common.api.ApiResponse;
import com.tripwise.common.api.PageResponse;
import com.tripwise.place.application.dto.NearbyPlacesQuery;
import com.tripwise.place.application.dto.PlaceDetailResponse;
import com.tripwise.place.application.dto.PlaceResponse;
import com.tripwise.place.application.dto.SearchPlacesQuery;
import com.tripwise.place.application.service.GetPlaceDetailUseCase;
import com.tripwise.place.application.service.NearbyPlacesUseCase;
import com.tripwise.place.application.service.SearchPlacesUseCase;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/places")
@Validated
@RequiredArgsConstructor
@Tag(name = "Places", description = "Public place discovery endpoints")
public class PlaceController {

    private static final int DEFAULT_PAGE = 0;
    private static final int DEFAULT_SIZE = 10;
    private static final int MAX_PAGE_SIZE = 100;
    private static final double DEFAULT_RADIUS_METERS = 5000;
    private static final int DEFAULT_LIMIT = 20;
    private static final int MAX_NEARBY_LIMIT = 100;

    private final SearchPlacesUseCase searchPlacesUseCase;
    private final NearbyPlacesUseCase nearbyPlacesUseCase;
    private final GetPlaceDetailUseCase getPlaceDetailUseCase;

    @GetMapping
    @Operation(summary = "Search places", description = "Search verified places by city, category, tags, price level, and keyword with pagination.")
    public ResponseEntity<ApiResponse<PageResponse<PlaceResponse>>> searchPlaces(
            @RequestParam(required = false) String city,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) List<String> tags,
            @RequestParam(required = false) String priceLevel,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") Integer page,
            @RequestParam(defaultValue = "10") Integer size
    ) {
        SearchPlacesQuery query = SearchPlacesQuery.builder()
                .city(city)
                .categoryId(categoryId)
                .tags(tags)
                .priceLevel(priceLevel)
                .keyword(keyword)
                .build();

        PageRequest pageRequest = PageRequest.of(
                normalizePage(page),
                normalizeSize(size),
                Sort.by(Sort.Direction.ASC, "name")
        );

        PageResponse<PlaceResponse> response = PageResponse.of(searchPlacesUseCase.execute(query, pageRequest));
        return ResponseEntity.ok(ApiResponse.success("Places fetched successfully", response));
    }

    @GetMapping("/nearby")
    @Operation(summary = "Get nearby places", description = "Return nearby verified places around a latitude/longitude coordinate.")
    public ResponseEntity<ApiResponse<List<PlaceResponse>>> getNearbyPlaces(
            @RequestParam("lat")
            @DecimalMin(value = "-90.0", message = "Latitude must be greater than or equal to -90")
            @DecimalMax(value = "90.0", message = "Latitude must be less than or equal to 90")
            Double latitude,
            @RequestParam("lng")
            @DecimalMin(value = "-180.0", message = "Longitude must be greater than or equal to -180")
            @DecimalMax(value = "180.0", message = "Longitude must be less than or equal to 180")
            Double longitude,
            @RequestParam(defaultValue = "5000")
            @DecimalMin(value = "1.0", message = "Radius must be greater than 0")
            @DecimalMax(value = "50000.0", message = "Radius must be less than or equal to 50000")
            Double radius,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(defaultValue = "20")
            @Min(value = 1, message = "Limit must be greater than 0")
            @Max(value = MAX_NEARBY_LIMIT, message = "Limit must be less than or equal to 100")
            Integer limit
    ) {
        NearbyPlacesQuery query = NearbyPlacesQuery.builder()
                .latitude(latitude)
                .longitude(longitude)
                .radiusMeters(normalizeRadius(radius))
                .categoryId(categoryId)
                .limit(normalizeLimit(limit))
                .build();

        return ResponseEntity.ok(ApiResponse.success(
                "Nearby places fetched successfully",
                nearbyPlacesUseCase.execute(query)
        ));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get place detail", description = "Return detailed information for a verified place.")
    public ResponseEntity<ApiResponse<PlaceDetailResponse>> getPlaceDetail(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(
                "Place detail fetched successfully",
                getPlaceDetailUseCase.execute(id)
        ));
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

    private double normalizeRadius(Double radius) {
        return radius == null ? DEFAULT_RADIUS_METERS : radius;
    }

    private int normalizeLimit(Integer limit) {
        if (limit == null || limit < 1) {
            return DEFAULT_LIMIT;
        }
        return Math.min(limit, MAX_NEARBY_LIMIT);
    }
}
