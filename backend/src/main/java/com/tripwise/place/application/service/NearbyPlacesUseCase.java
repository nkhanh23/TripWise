package com.tripwise.place.application.service;

import com.tripwise.place.application.dto.NearbyPlacesQuery;
import com.tripwise.place.application.dto.PlaceResponse;
import com.tripwise.place.application.mapper.PlaceMapper;
import com.tripwise.place.domain.entity.Place;
import com.tripwise.place.infrastructure.persistence.repository.PlaceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class NearbyPlacesUseCase {

    private final PlaceRepository placeRepository;
    private final PlaceMapper placeMapper;

    @Transactional(readOnly = true)
    public List<PlaceResponse> execute(NearbyPlacesQuery query) {
        List<PlaceRepository.PlaceDistanceProjection> nearbyRows =
                placeRepository.findActiveVerifiedPlaceDistancesWithinRadius(
                        query.getLongitude(),
                        query.getLatitude(),
                        query.getRadiusMeters(),
                        query.getCategoryId(),
                        query.getLimit()
                );

        if (nearbyRows.isEmpty()) {
            return List.of();
        }

        List<Long> placeIds = nearbyRows.stream()
                .map(PlaceRepository.PlaceDistanceProjection::getPlaceId)
                .toList();

        Map<Long, Place> placesById = new LinkedHashMap<>();
        for (Place place : placeRepository.findAllByIdIn(placeIds)) {
            placesById.put(place.getId(), place);
        }

        Map<Long, Double> distanceByPlaceId = new LinkedHashMap<>();
        for (PlaceRepository.PlaceDistanceProjection row : nearbyRows) {
            distanceByPlaceId.put(row.getPlaceId(), row.getDistanceMeters());
        }

        return placeIds.stream()
                .map(placesById::get)
                .filter(java.util.Objects::nonNull)
                .map(place -> {
                    PlaceResponse response = placeMapper.toResponse(place);
                    response.setDistanceMeters(distanceByPlaceId.get(place.getId()));
                    return response;
                })
                .toList();
    }
}
