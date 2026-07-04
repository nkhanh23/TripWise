package com.tripwise.place.application.service;

import com.tripwise.place.application.dto.PlaceResponse;
import com.tripwise.place.application.dto.SearchPlacesQuery;
import com.tripwise.place.infrastructure.persistence.PlacePublicReadJdbcRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SearchPlacesUseCase {

    private final PlacePublicReadJdbcRepository placePublicReadJdbcRepository;

    @Transactional(readOnly = true)
    public Page<PlaceResponse> execute(
            SearchPlacesQuery query,
            Pageable pageable,
            String sortBy,
            String sortDirection
    ) {
        return placePublicReadJdbcRepository.search(query, pageable, sortBy, sortDirection);
    }
}
