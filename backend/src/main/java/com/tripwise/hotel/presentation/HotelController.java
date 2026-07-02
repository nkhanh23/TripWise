package com.tripwise.hotel.presentation;

import com.tripwise.common.api.ApiResponse;
import com.tripwise.hotel.application.dto.HotelResponse;
import com.tripwise.hotel.application.dto.HotelSuggestionQuery;
import com.tripwise.hotel.application.service.SuggestHotelsUseCase;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Validated
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/hotels")
@Tag(name = "Hotels", description = "Hotel suggestion endpoints")
public class HotelController {

    private final SuggestHotelsUseCase suggestHotelsUseCase;

    @GetMapping("/suggestions")
    @Operation(summary = "Suggest hotels", description = "Return hotel suggestions filtered by city, budget, and star rating.")
    public ResponseEntity<ApiResponse<List<HotelResponse>>> suggestHotels(@Valid HotelSuggestionQuery query) {
        return ResponseEntity.ok(ApiResponse.success(
                "Hotel suggestions fetched successfully",
                suggestHotelsUseCase.execute(query)
        ));
    }
}
