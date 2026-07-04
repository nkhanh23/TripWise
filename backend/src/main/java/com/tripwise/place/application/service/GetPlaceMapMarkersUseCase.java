package com.tripwise.place.application.service;

import com.tripwise.place.application.dto.MapPlacesQuery;
import com.tripwise.place.application.dto.PlaceMapMarkerResponse;
import com.tripwise.place.infrastructure.persistence.PlacePublicReadJdbcRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class GetPlaceMapMarkersUseCase {

    private final PlacePublicReadJdbcRepository placePublicReadJdbcRepository;

    @Transactional(readOnly = true)
    public List<PlaceMapMarkerResponse> execute(MapPlacesQuery query) {
        return placePublicReadJdbcRepository.findMapMarkers(query);
    }
}
