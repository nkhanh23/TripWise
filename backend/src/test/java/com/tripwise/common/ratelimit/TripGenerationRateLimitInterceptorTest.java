package com.tripwise.common.ratelimit;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tripwise.auth.infrastructure.security.JwtAuthenticationEntryPoint;
import com.tripwise.auth.infrastructure.security.JwtAuthenticationFilter;
import com.tripwise.auth.infrastructure.security.JwtTokenService;
import com.tripwise.common.exception.GlobalExceptionHandler;
import com.tripwise.common.security.SecurityConfig;
import com.tripwise.itinerary.application.dto.GeneratedItineraryResponse;
import com.tripwise.itinerary.application.service.GenerateItineraryUseCase;
import com.tripwise.trip.application.service.DeleteTripUseCase;
import com.tripwise.trip.application.service.GetTripDetailUseCase;
import com.tripwise.trip.application.service.ListUserTripsUseCase;
import com.tripwise.trip.domain.enums.TripStatus;
import com.tripwise.trip.presentation.TripController;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(
        value = TripController.class,
        properties = {
                "tripwise.rate-limit.enabled=true",
                "tripwise.rate-limit.trip-generation.capacity=2",
                "tripwise.rate-limit.trip-generation.window=PT1M"
        }
)
@Import({
        SecurityConfig.class,
        GlobalExceptionHandler.class,
        JwtAuthenticationFilter.class,
        JwtAuthenticationEntryPoint.class,
        RateLimitConfig.class,
        AuthRateLimitInterceptor.class
})
class TripGenerationRateLimitInterceptorTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private GenerateItineraryUseCase generateItineraryUseCase;

    @MockBean
    private ListUserTripsUseCase listUserTripsUseCase;

    @MockBean
    private GetTripDetailUseCase getTripDetailUseCase;

    @MockBean
    private DeleteTripUseCase deleteTripUseCase;

    @MockBean
    private JwtTokenService jwtTokenService;

    @MockBean
    private UserDetailsService userDetailsService;

    @Test
    @WithMockUser(username = "traveler@example.com")
    void generateTripShouldReturn429OnThirdRequestForSameAuthenticatedUser() throws Exception {
        when(generateItineraryUseCase.execute(eq("traveler@example.com"), any()))
                .thenReturn(GeneratedItineraryResponse.builder()
                        .id(1L)
                        .destination("Nha Trang")
                        .days(2)
                        .nights(1)
                        .status(TripStatus.GENERATED)
                        .build());

        String body = objectMapper.writeValueAsString(new com.tripwise.trip.application.dto.CreateTripRequest("Di Nha Trang 2 ngay"));

        for (int i = 0; i < 2; i++) {
            mockMvc.perform(post("/api/v1/trips/generate")
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isCreated());
        }

        mockMvc.perform(post("/api/v1/trips/generate")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.status").value(429))
                .andExpect(jsonPath("$.errorCode").value("TOO_MANY_REQUESTS"));
    }
}
