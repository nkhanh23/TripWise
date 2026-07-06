package com.tripwise.place.application.service;

import com.tripwise.place.application.dto.AdminPlaceReviewQuery;
import com.tripwise.place.application.dto.AdminPlaceReviewResponse;
import com.tripwise.place.infrastructure.persistence.PlaceAdminReviewJdbcRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SearchAdminPlaceReviewUseCase {

    private final PlaceAdminReviewJdbcRepository placeAdminReviewJdbcRepository;

    @Transactional(readOnly = true)
    public Page<AdminPlaceReviewResponse> execute(
            AdminPlaceReviewQuery query,
            Pageable pageable,
            String sortBy,
            String sortDirection
    ) {
        return placeAdminReviewJdbcRepository.search(query, pageable, sortBy, sortDirection);
    }
}
