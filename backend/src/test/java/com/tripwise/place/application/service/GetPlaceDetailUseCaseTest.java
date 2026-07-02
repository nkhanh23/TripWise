package com.tripwise.place.application.service;

import com.tripwise.common.exception.ResourceNotFoundException;
import com.tripwise.place.application.dto.PlaceDetailResponse;
import com.tripwise.place.application.mapper.PlaceMapper;
import com.tripwise.place.domain.entity.Place;
import com.tripwise.place.infrastructure.persistence.repository.PlaceRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GetPlaceDetailUseCaseTest {

    @Mock
    private PlaceRepository placeRepository;

    @Mock
    private PlaceMapper placeMapper;

    @InjectMocks
    private GetPlaceDetailUseCase getPlaceDetailUseCase;

    @Test
    void execute_WhenPlaceExists_ShouldReturnPlaceDetail() {
        Long placeId = 1L;
        Place mockPlace = new Place();
        mockPlace.setId(placeId);
        
        PlaceDetailResponse mockResponse = new PlaceDetailResponse();
        mockResponse.setId(placeId);
        
        when(placeRepository.findPublicDetailById(placeId)).thenReturn(Optional.of(mockPlace));
        when(placeMapper.toDetailResponse(mockPlace)).thenReturn(mockResponse);

        PlaceDetailResponse result = getPlaceDetailUseCase.execute(placeId);

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(placeId);
        
        verify(placeRepository).findPublicDetailById(placeId);
        verify(placeMapper).toDetailResponse(mockPlace);
    }

    @Test
    void execute_WhenPlaceNotFound_ShouldThrowException() {
        Long placeId = 999L;
        
        when(placeRepository.findPublicDetailById(placeId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> getPlaceDetailUseCase.execute(placeId))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Place not found");
                
        verify(placeRepository).findPublicDetailById(placeId);
    }
}
