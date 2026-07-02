package com.tripwise.hotel.application.service;

import com.tripwise.common.exception.BusinessException;
import com.tripwise.hotel.application.dto.HotelResponse;
import com.tripwise.hotel.application.dto.HotelSuggestionQuery;
import com.tripwise.hotel.domain.entity.Hotel;
import com.tripwise.hotel.infrastructure.persistence.repository.HotelRepository;
import lombok.RequiredArgsConstructor;
import org.locationtech.jts.geom.Point;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class SuggestHotelsUseCase {

    private static final Set<String> ALLOWED_BUDGETS = Set.of("LOW", "MEDIUM", "HIGH");

    private final HotelRepository hotelRepository;

    @Transactional(readOnly = true)
    public List<HotelResponse> execute(HotelSuggestionQuery query) {
        validateQuery(query);

        String normalizedCity = query.getCity().trim();
        String normalizedBudget = normalizeBudget(query.getBudget());
        Integer minimumStarRating = query.getStarRating();

        List<Hotel> hotels;
        if (normalizedBudget != null && minimumStarRating != null) {
            hotels = hotelRepository.findTop20ByCityIgnoreCaseAndPriceLevelIgnoreCaseAndStarRatingGreaterThanEqualAndIsActiveTrueOrderByStarRatingDescNameAsc(
                    normalizedCity,
                    normalizedBudget,
                    minimumStarRating
            );
        } else if (normalizedBudget != null) {
            hotels = hotelRepository.findTop20ByCityIgnoreCaseAndPriceLevelIgnoreCaseAndIsActiveTrueOrderByStarRatingDescNameAsc(
                    normalizedCity,
                    normalizedBudget
            );
        } else if (minimumStarRating != null) {
            hotels = hotelRepository.findTop20ByCityIgnoreCaseAndStarRatingGreaterThanEqualAndIsActiveTrueOrderByStarRatingDescNameAsc(
                    normalizedCity,
                    minimumStarRating
            );
        } else {
            hotels = hotelRepository.findTop20ByCityIgnoreCaseAndIsActiveTrueOrderByStarRatingDescNameAsc(
                    normalizedCity
            );
        }

        return hotels.stream()
                .map(this::toResponse)
                .toList();
    }

    private void validateQuery(HotelSuggestionQuery query) {
        if (query == null || query.getCity() == null || query.getCity().isBlank()) {
            throw new BusinessException("city khong duoc de trong", "VALIDATION_ERROR", HttpStatus.BAD_REQUEST);
        }

        if (query.getBudget() != null) {
            String normalizedBudget = normalizeBudget(query.getBudget());
            if (!ALLOWED_BUDGETS.contains(normalizedBudget)) {
                throw new BusinessException("budget chi ho tro LOW, MEDIUM hoac HIGH",
                        "VALIDATION_ERROR", HttpStatus.BAD_REQUEST);
            }
        }
    }

    private String normalizeBudget(String budget) {
        return budget == null ? null : budget.trim().toUpperCase(Locale.ROOT);
    }

    private HotelResponse toResponse(Hotel hotel) {
        Point location = hotel.getLocation();
        return HotelResponse.builder()
                .id(hotel.getId())
                .name(hotel.getName())
                .city(hotel.getCity())
                .priceLevel(hotel.getPriceLevel())
                .starRating(hotel.getStarRating())
                .googleMapsUrl(hotel.getGoogleMapsUrl())
                .description(hotel.getDescription())
                .latitude(location != null ? location.getY() : null)
                .longitude(location != null ? location.getX() : null)
                .build();
    }
}
