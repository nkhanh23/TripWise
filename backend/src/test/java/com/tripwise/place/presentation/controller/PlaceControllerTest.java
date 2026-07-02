package com.tripwise.place.presentation.controller;

import com.tripwise.auth.infrastructure.security.JwtAuthenticationEntryPoint;
import com.tripwise.auth.infrastructure.security.JwtAuthenticationFilter;
import com.tripwise.auth.infrastructure.security.JwtTokenService;
import com.tripwise.common.exception.GlobalExceptionHandler;
import com.tripwise.common.exception.ResourceNotFoundException;
import com.tripwise.common.security.SecurityConfig;
import com.tripwise.place.application.dto.PlaceDetailResponse;
import com.tripwise.place.application.service.GetPlaceDetailUseCase;
import com.tripwise.place.application.dto.PlaceResponse;
import com.tripwise.place.application.service.NearbyPlacesUseCase;
import com.tripwise.place.application.service.SearchPlacesUseCase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(value = PlaceController.class, properties = "tripwise.rate-limit.enabled=false")
@Import({SecurityConfig.class, GlobalExceptionHandler.class, JwtAuthenticationFilter.class, JwtAuthenticationEntryPoint.class})
class PlaceControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SearchPlacesUseCase searchPlacesUseCase;

    @MockBean
    private NearbyPlacesUseCase nearbyPlacesUseCase;

    @MockBean
    private GetPlaceDetailUseCase getPlaceDetailUseCase;

    @MockBean
    private JwtTokenService jwtTokenService;

    @MockBean
    private UserDetailsService userDetailsService;

    @Test
    void searchPlaces_ShouldReturnPaginatedPlacesWithoutAuthentication() throws Exception {
        PlaceResponse placeResponse = PlaceResponse.builder()
                .id(1L)
                .name("Trần Phú Beach")
                .city("Nha Trang")
                .categoryId(1L)
                .categoryName("Beach")
                .categorySlug("beach")
                .priceLevel("LOW")
                .rating(new BigDecimal("4.6"))
                .latitude(12.2502)
                .longitude(109.1968)
                .tags(Set.of("beach", "sunrise"))
                .build();

        when(searchPlacesUseCase.execute(any(), any()))
                .thenReturn(new PageImpl<>(
                        List.of(placeResponse),
                        PageRequest.of(0, 10, Sort.by(Sort.Direction.ASC, "name")),
                        1
                ));

        mockMvc.perform(get("/api/v1/places")
                        .param("city", "Nha Trang")
                        .param("tags", "beach")
                        .param("keyword", "beach")
                        .param("page", "0")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Places fetched successfully"))
                .andExpect(jsonPath("$.data.page").value(0))
                .andExpect(jsonPath("$.data.size").value(10))
                .andExpect(jsonPath("$.data.totalElements").value(1))
                .andExpect(jsonPath("$.data.content[0].name").value("Trần Phú Beach"))
                .andExpect(jsonPath("$.data.content[0].categorySlug").value("beach"))
                .andExpect(jsonPath("$.data.content[0].latitude").value(12.2502))
                .andExpect(jsonPath("$.data.content[0].longitude").value(109.1968));

        verify(searchPlacesUseCase).execute(any(), any());
    }

    @Test
    void searchPlaces_ShouldClampInvalidPaginationValues() throws Exception {
        when(searchPlacesUseCase.execute(any(), any()))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 100), 0));

        mockMvc.perform(get("/api/v1/places")
                        .param("page", "-5")
                        .param("size", "1000"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.page").value(0))
                .andExpect(jsonPath("$.data.size").value(100));
    }

    @Test
    void getNearbyPlaces_ShouldReturnSortedPlacesWithDistance() throws Exception {
        PlaceResponse nearest = PlaceResponse.builder()
                .id(1L)
                .name("Tháp Trầm Hương")
                .distanceMeters(120.5)
                .latitude(12.2404806)
                .longitude(109.1967972)
                .build();

        PlaceResponse second = PlaceResponse.builder()
                .id(2L)
                .name("Trần Phú Beach")
                .distanceMeters(300.0)
                .latitude(12.2502)
                .longitude(109.1968)
                .build();

        when(nearbyPlacesUseCase.execute(any())).thenReturn(List.of(nearest, second));

        mockMvc.perform(get("/api/v1/places/nearby")
                        .param("lat", "12.2388")
                        .param("lng", "109.1967")
                        .param("radius", "5000")
                        .param("limit", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Nearby places fetched successfully"))
                .andExpect(jsonPath("$.data[0].name").value("Tháp Trầm Hương"))
                .andExpect(jsonPath("$.data[0].distanceMeters").value(120.5))
                .andExpect(jsonPath("$.data[1].name").value("Trần Phú Beach"))
                .andExpect(jsonPath("$.data[1].distanceMeters").value(300.0));
    }

    @Test
    void getNearbyPlaces_ShouldReturn400_WhenLatitudeIsInvalid() throws Exception {
        mockMvc.perform(get("/api/v1/places/nearby")
                        .param("lat", "91")
                        .param("lng", "109.1967"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.details[0].field").value("latitude"));
    }

    @Test
    void getPlaceDetail_ShouldReturnPlaceDetailWithoutAuthentication() throws Exception {
        PlaceDetailResponse response = PlaceDetailResponse.builder()
                .id(1L)
                .name("Chùa Long Sơn")
                .city("Nha Trang")
                .categoryId(3L)
                .categoryName("Spiritual")
                .categorySlug("spiritual")
                .description("Famous pagoda with giant white Buddha statue.")
                .priceLevel("LOW")
                .latitude(12.251601)
                .longitude(109.180765)
                .tags(Set.of("pagoda", "buddha", "viewpoint"))
                .build();

        when(getPlaceDetailUseCase.execute(1L)).thenReturn(response);

        mockMvc.perform(get("/api/v1/places/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Place detail fetched successfully"))
                .andExpect(jsonPath("$.data.id").value(1))
                .andExpect(jsonPath("$.data.name").value("Chùa Long Sơn"))
                .andExpect(jsonPath("$.data.categorySlug").value("spiritual"));
    }

    @Test
    void getPlaceDetail_ShouldReturn404_WhenPlaceDoesNotExist() throws Exception {
        when(getPlaceDetailUseCase.execute(99999L))
                .thenThrow(new ResourceNotFoundException("Place not found"));

        mockMvc.perform(get("/api/v1/places/99999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.errorCode").value("RESOURCE_NOT_FOUND"))
                .andExpect(jsonPath("$.message").value("Place not found"));
    }
}
