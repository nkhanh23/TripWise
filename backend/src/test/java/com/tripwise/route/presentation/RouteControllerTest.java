package com.tripwise.route.presentation;

import com.tripwise.auth.infrastructure.security.JwtAuthenticationEntryPoint;
import com.tripwise.auth.infrastructure.security.JwtAuthenticationFilter;
import com.tripwise.auth.infrastructure.security.JwtTokenService;
import com.tripwise.common.exception.GlobalExceptionHandler;
import com.tripwise.common.security.SecurityConfig;
import com.tripwise.route.application.service.CalculateRouteUseCase;
import com.tripwise.route.domain.RouteResult;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(value = RouteController.class, properties = "tripwise.rate-limit.enabled=false")
@Import({SecurityConfig.class, GlobalExceptionHandler.class, JwtAuthenticationFilter.class, JwtAuthenticationEntryPoint.class})
class RouteControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private CalculateRouteUseCase calculateRouteUseCase;

    @MockBean
    private JwtTokenService jwtTokenService;

    @MockBean
    private UserDetailsService userDetailsService;

    @Test
    @WithMockUser(username = "test@example.com")
    void getRoute_WithValidRequest_ShouldReturnRoute() throws Exception {
        when(calculateRouteUseCase.execute(12.2404, 109.1967, 12.2521, 109.2105, "driving"))
                .thenReturn(new RouteResult(
                        1823.4,
                        365.2,
                        "{\"type\":\"LineString\",\"coordinates\":[[109.1967,12.2404],[109.2105,12.2521]]}"
                ));

        mockMvc.perform(get("/api/v1/routes")
                        .param("originLat", "12.2404")
                        .param("originLng", "109.1967")
                        .param("destLat", "12.2521")
                        .param("destLng", "109.2105")
                        .param("profile", "driving"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Route calculated successfully"))
                .andExpect(jsonPath("$.data.distanceMeters").value(1823.4))
                .andExpect(jsonPath("$.data.durationSeconds").value(365.2))
                .andExpect(jsonPath("$.data.geometry").value("{\"type\":\"LineString\",\"coordinates\":[[109.1967,12.2404],[109.2105,12.2521]]}"));

        verify(calculateRouteUseCase).execute(12.2404, 109.1967, 12.2521, 109.2105, "driving");
    }

    @Test
    void getRoute_WithoutAuthentication_ShouldReturn401() throws Exception {
        mockMvc.perform(get("/api/v1/routes")
                        .param("originLat", "12.2404")
                        .param("originLng", "109.1967")
                        .param("destLat", "12.2521")
                        .param("destLng", "109.2105")
                        .param("profile", "driving"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "test@example.com")
    void getRoute_WithInvalidLatitude_ShouldReturn400() throws Exception {
        mockMvc.perform(get("/api/v1/routes")
                        .param("originLat", "91")
                        .param("originLng", "109.1967")
                        .param("destLat", "12.2521")
                        .param("destLng", "109.2105")
                        .param("profile", "driving"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.details[0].field").value("originLat"));
    }

    @Test
    @WithMockUser(username = "test@example.com")
    void getRoute_WithInvalidProfile_ShouldReturn400() throws Exception {
        mockMvc.perform(get("/api/v1/routes")
                        .param("originLat", "12.2404")
                        .param("originLng", "109.1967")
                        .param("destLat", "12.2521")
                        .param("destLng", "109.2105")
                        .param("profile", "flying"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.details[0].field").value("profile"));
    }

    @Test
    @WithMockUser(username = "test@example.com")
    void getRoute_WithMissingOriginLat_ShouldReturn400() throws Exception {
        mockMvc.perform(get("/api/v1/routes")
                        .param("originLng", "109.1967")
                        .param("destLat", "12.2521")
                        .param("destLng", "109.2105")
                        .param("profile", "driving"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.details[0].field").value("originLat"));
    }
}
