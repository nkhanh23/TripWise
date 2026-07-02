package com.tripwise.place.application.service;

import com.tripwise.common.exception.ResourceNotFoundException;
import com.tripwise.place.application.dto.PlaceDetailResponse;
import com.tripwise.place.application.mapper.PlaceMapper;
import com.tripwise.place.domain.entity.Place;
import com.tripwise.place.infrastructure.persistence.repository.PlaceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class GetPlaceDetailUseCase {

    private final PlaceRepository placeRepository;
    private final PlaceMapper placeMapper;

    @Transactional(readOnly = true)
    public PlaceDetailResponse execute(Long placeId) {
        Place place = placeRepository.findPublicDetailById(placeId)
                .orElseThrow(() -> new ResourceNotFoundException("Place not found"));

        return placeMapper.toDetailResponse(place);
    }
}
