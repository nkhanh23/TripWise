package com.tripwise.place.presentation.controller;

import com.tripwise.auth.infrastructure.security.JwtAuthenticationEntryPoint;
import com.tripwise.auth.infrastructure.security.JwtAuthenticationFilter;
import com.tripwise.auth.infrastructure.security.JwtTokenService;
import com.tripwise.common.exception.GlobalExceptionHandler;
import com.tripwise.common.security.SecurityConfig;
import com.tripwise.place.application.dto.AdminPlaceReviewResponse;
import com.tripwise.place.application.service.SearchAdminPlaceReviewUseCase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;
import java.util.Set;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(value = AdminPlaceReviewController.class, properties = "tripwise.rate-limit.enabled=false")
@Import({SecurityConfig.class, GlobalExceptionHandler.class, JwtAuthenticationFilter.class, JwtAuthenticationEntryPoint.class})
class AdminPlaceReviewControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SearchAdminPlaceReviewUseCase searchAdminPlaceReviewUseCase;

    @MockBean
    private JwtTokenService jwtTokenService;

    @MockBean
    private UserDetailsService userDetailsService;

    @Test
    void reviewPlacesShouldReturn401WhenUnauthenticated() throws Exception {
        mockMvc.perform(get("/api/v1/admin/places/review"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "USER")
    void reviewPlacesShouldReturn403WhenUserIsNotAdmin() throws Exception {
        mockMvc.perform(get("/api/v1/admin/places/review"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void reviewPlacesShouldReturnPaginatedDataForAdmin() throws Exception {
        AdminPlaceReviewResponse response = AdminPlaceReviewResponse.builder()
                .id(7L)
                .name("HCM Review Pending Place")
                .source("OSM_GEOFABRIK")
                .city("Hồ Chí Minh")
                .placeType("ATTRACTION")
                .verificationStatus("PENDING")
                .recommendable(false)
                .qualityScore(72)
                .rejectReason("LOW_TRUST")
                .tags(Set.of("viewpoint"))
                .rawTags("{\"tourism\":\"viewpoint\"}")
                .updatedAt(Instant.parse("2026-07-06T12:00:00Z"))
                .build();

        when(searchAdminPlaceReviewUseCase.execute(any(), any(), anyString(), anyString()))
                .thenReturn(new PageImpl<>(List.of(response), PageRequest.of(0, 20), 1));

        mockMvc.perform(get("/api/v1/admin/places/review")
                        .param("city", "Hồ Chí Minh")
                        .param("verificationStatus", "PENDING")
                        .param("placeType", "ATTRACTION")
                        .param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Admin places review fetched successfully"))
                .andExpect(jsonPath("$.data.page").value(0))
                .andExpect(jsonPath("$.data.size").value(20))
                .andExpect(jsonPath("$.data.totalElements").value(1))
                .andExpect(jsonPath("$.data.content[0].name").value("HCM Review Pending Place"))
                .andExpect(jsonPath("$.data.content[0].source").value("OSM_GEOFABRIK"))
                .andExpect(jsonPath("$.data.content[0].verificationStatus").value("PENDING"))
                .andExpect(jsonPath("$.data.content[0].placeType").value("ATTRACTION"));

        verify(searchAdminPlaceReviewUseCase).execute(any(), any(), anyString(), anyString());
    }
}
