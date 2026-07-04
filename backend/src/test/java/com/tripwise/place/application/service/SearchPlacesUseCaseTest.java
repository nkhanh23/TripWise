package com.tripwise.place.application.service;

import com.tripwise.place.application.dto.PlaceResponse;
import com.tripwise.place.application.dto.SearchPlacesQuery;
import com.tripwise.place.infrastructure.persistence.PlacePublicReadJdbcRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SearchPlacesUseCaseTest {

    @Mock
    private PlacePublicReadJdbcRepository placePublicReadJdbcRepository;

    @InjectMocks
    private SearchPlacesUseCase searchPlacesUseCase;

    @Test
    void execute_ShouldReturnPaginatedResponses() {
        SearchPlacesQuery query = SearchPlacesQuery.builder()
                .province("Khanh Hoa")
                .city("Nha Trang")
                .build();
        Pageable pageable = PageRequest.of(0, 10);

        PlaceResponse mockResponse = PlaceResponse.builder()
                .id(1L)
                .name("Chua Long Son")
                .build();
        Page<PlaceResponse> responsePage = new PageImpl<>(List.of(mockResponse), pageable, 1);

        when(placePublicReadJdbcRepository.search(query, pageable, "popularityScore", "desc"))
                .thenReturn(responsePage);

        Page<PlaceResponse> result = searchPlacesUseCase.execute(query, pageable, "popularityScore", "desc");

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getId()).isEqualTo(1L);
        assertThat(result.getTotalElements()).isEqualTo(1);
        verify(placePublicReadJdbcRepository).search(query, pageable, "popularityScore", "desc");
    }
}
