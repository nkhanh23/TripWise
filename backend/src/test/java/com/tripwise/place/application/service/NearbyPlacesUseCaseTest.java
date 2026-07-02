package com.tripwise.place.application.service;

import com.tripwise.place.application.dto.NearbyPlacesQuery;
import com.tripwise.place.application.dto.PlaceResponse;
import com.tripwise.place.application.mapper.PlaceMapper;
import com.tripwise.place.domain.entity.Place;
import com.tripwise.place.infrastructure.persistence.repository.PlaceRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NearbyPlacesUseCaseTest {

    @Mock
    private PlaceRepository placeRepository;

    @Mock
    private PlaceMapper placeMapper;

    @InjectMocks
    private NearbyPlacesUseCase nearbyPlacesUseCase;

    @Test
    void execute_WhenNoPlacesFound_ShouldReturnEmptyList() {
        NearbyPlacesQuery query = NearbyPlacesQuery.builder()
                .longitude(109.19)
                .latitude(12.25)
                .radiusMeters(5000.0)
                .limit(20)
                .build();
                
        when(placeRepository.findActiveVerifiedPlaceDistancesWithinRadius(
                anyDouble(), anyDouble(), anyDouble(), any(), anyInt()))
                .thenReturn(Collections.emptyList());

        List<PlaceResponse> result = nearbyPlacesUseCase.execute(query);

        assertThat(result).isEmpty();
    }

    @Test
    void execute_WhenPlacesFound_ShouldReturnMappedResponses() {
        NearbyPlacesQuery query = NearbyPlacesQuery.builder()
                .longitude(109.19)
                .latitude(12.25)
                .radiusMeters(5000.0)
                .limit(20)
                .build();

        PlaceRepository.PlaceDistanceProjection projection = mock(PlaceRepository.PlaceDistanceProjection.class);
        when(projection.getPlaceId()).thenReturn(1L);
        when(projection.getDistanceMeters()).thenReturn(1500.5);

        when(placeRepository.findActiveVerifiedPlaceDistancesWithinRadius(
                query.getLongitude(), query.getLatitude(), query.getRadiusMeters(), query.getCategoryId(), query.getLimit()))
                .thenReturn(List.of(projection));

        Place mockPlace = new Place();
        mockPlace.setId(1L);
        when(placeRepository.findAllByIdIn(List.of(1L))).thenReturn(List.of(mockPlace));

        PlaceResponse mockResponse = new PlaceResponse();
        mockResponse.setId(1L);
        when(placeMapper.toResponse(mockPlace)).thenReturn(mockResponse);

        List<PlaceResponse> result = nearbyPlacesUseCase.execute(query);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getId()).isEqualTo(1L);
        assertThat(result.get(0).getDistanceMeters()).isEqualTo(1500.5);
    }
}
