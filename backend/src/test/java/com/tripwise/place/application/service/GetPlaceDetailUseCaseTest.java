package com.tripwise.place.application.service;

import com.tripwise.common.exception.ResourceNotFoundException;
import com.tripwise.place.application.dto.PlaceDetailResponse;
import com.tripwise.place.infrastructure.persistence.PlacePublicReadJdbcRepository;
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
    private PlacePublicReadJdbcRepository placePublicReadJdbcRepository;

    @InjectMocks
    private GetPlaceDetailUseCase getPlaceDetailUseCase;

    @Test
    void execute_WhenPlaceExists_ShouldReturnPlaceDetail() {
        Long placeId = 1L;
        PlaceDetailResponse mockResponse = PlaceDetailResponse.builder()
                .id(placeId)
                .name("Chua Long Son")
                .build();

        when(placePublicReadJdbcRepository.findPublicPlaceDetailById(placeId))
                .thenReturn(Optional.of(mockResponse));

        PlaceDetailResponse result = getPlaceDetailUseCase.execute(placeId);

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(placeId);
        verify(placePublicReadJdbcRepository).findPublicPlaceDetailById(placeId);
    }

    @Test
    void execute_WhenPlaceNotFound_ShouldThrowException() {
        Long placeId = 999L;

        when(placePublicReadJdbcRepository.findPublicPlaceDetailById(placeId))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> getPlaceDetailUseCase.execute(placeId))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Place not found");

        verify(placePublicReadJdbcRepository).findPublicPlaceDetailById(placeId);
    }
}
