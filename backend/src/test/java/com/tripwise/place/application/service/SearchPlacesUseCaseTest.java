package com.tripwise.place.application.service;

import com.tripwise.place.application.dto.PlaceResponse;
import com.tripwise.place.application.dto.SearchPlacesQuery;
import com.tripwise.place.application.mapper.PlaceMapper;
import com.tripwise.place.domain.entity.Place;
import com.tripwise.place.infrastructure.persistence.repository.PlaceRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SearchPlacesUseCaseTest {

    @Mock
    private PlaceRepository placeRepository;

    @Mock
    private PlaceMapper placeMapper;

    @InjectMocks
    private SearchPlacesUseCase searchPlacesUseCase;

    @Test
    void execute_ShouldReturnPaginatedResponses() {
        SearchPlacesQuery query = SearchPlacesQuery.builder()
                .city("Nha Trang")
                .build();
        Pageable pageable = PageRequest.of(0, 10);

        Place mockPlace = new Place();
        mockPlace.setId(1L);
        Page<Place> placePage = new PageImpl<>(List.of(mockPlace), pageable, 1);

        when(placeRepository.findAll(any(Specification.class), eq(pageable))).thenReturn(placePage);

        PlaceResponse mockResponse = new PlaceResponse();
        mockResponse.setId(1L);
        when(placeMapper.toResponse(mockPlace)).thenReturn(mockResponse);

        Page<PlaceResponse> result = searchPlacesUseCase.execute(query, pageable);

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getId()).isEqualTo(1L);
        assertThat(result.getTotalElements()).isEqualTo(1);
    }
}
