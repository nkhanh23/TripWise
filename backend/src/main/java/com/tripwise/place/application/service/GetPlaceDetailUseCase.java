package com.tripwise.place.application.service;

import com.tripwise.common.exception.ResourceNotFoundException;
import com.tripwise.place.application.dto.PlaceDetailResponse;
import com.tripwise.place.infrastructure.persistence.PlacePublicReadJdbcRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class GetPlaceDetailUseCase {

    private final PlacePublicReadJdbcRepository placePublicReadJdbcRepository;

    @Transactional(readOnly = true)
    public PlaceDetailResponse execute(Long placeId) {
        return placePublicReadJdbcRepository.findPublicPlaceDetailById(placeId)
                .orElseThrow(() -> new ResourceNotFoundException("Place not found"));
    }
}
