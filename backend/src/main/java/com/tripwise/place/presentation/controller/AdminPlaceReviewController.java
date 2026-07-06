package com.tripwise.place.presentation.controller;

import com.tripwise.common.api.ApiResponse;
import com.tripwise.common.api.PageResponse;
import com.tripwise.place.application.dto.AdminPlaceReviewQuery;
import com.tripwise.place.application.dto.AdminPlaceReviewResponse;
import com.tripwise.place.application.service.SearchAdminPlaceReviewUseCase;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/places/review")
@Validated
@RequiredArgsConstructor
@Tag(name = "Admin Places Review", description = "Read-only moderation review endpoints for admin")
public class AdminPlaceReviewController {

    private static final int DEFAULT_PAGE = 0;
    private static final int DEFAULT_SIZE = 20;
    private static final int MAX_PAGE_SIZE = 100;

    private final SearchAdminPlaceReviewUseCase searchAdminPlaceReviewUseCase;

    @GetMapping
    @Operation(summary = "Review places", description = "Return paginated place records for admin moderation review.")
    public ResponseEntity<ApiResponse<PageResponse<AdminPlaceReviewResponse>>> reviewPlaces(
            @RequestParam(required = false) String source,
            @RequestParam(required = false) String province,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String placeType,
            @RequestParam(required = false) String verificationStatus,
            @RequestParam(required = false) Boolean recommendable,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "updatedAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDirection,
            @RequestParam(defaultValue = "0") Integer page,
            @RequestParam(defaultValue = "20") Integer size
    ) {
        AdminPlaceReviewQuery query = AdminPlaceReviewQuery.builder()
                .source(source)
                .province(province)
                .city(city)
                .placeType(placeType)
                .verificationStatus(verificationStatus)
                .recommendable(recommendable)
                .keyword(keyword)
                .build();

        PageRequest pageRequest = PageRequest.of(normalizePage(page), normalizeSize(size));

        PageResponse<AdminPlaceReviewResponse> response = PageResponse.of(
                searchAdminPlaceReviewUseCase.execute(
                        query,
                        pageRequest,
                        normalizeSortBy(sortBy),
                        normalizeSortDirection(sortDirection)
                )
        );

        return ResponseEntity.ok(ApiResponse.success("Admin places review fetched successfully", response));
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

    private String normalizeSortBy(String sortBy) {
        if (sortBy == null || sortBy.isBlank()) {
            return "updatedAt";
        }

        return switch (sortBy.trim()) {
            case "updatedAt", "qualityScore", "name", "verificationStatus", "source" -> sortBy.trim();
            default -> "updatedAt";
        };
    }

    private String normalizeSortDirection(String sortDirection) {
        return "asc".equalsIgnoreCase(sortDirection) ? "asc" : "desc";
    }
}
