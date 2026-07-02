package com.tripwise.hotel.presentation;

import com.tripwise.auth.infrastructure.security.JwtAuthenticationEntryPoint;
import com.tripwise.auth.infrastructure.security.JwtAuthenticationFilter;
import com.tripwise.auth.infrastructure.security.JwtTokenService;
import com.tripwise.common.exception.BusinessException;
import com.tripwise.common.exception.GlobalExceptionHandler;
import com.tripwise.common.security.SecurityConfig;
import com.tripwise.hotel.application.dto.HotelResponse;
import com.tripwise.hotel.application.service.SuggestHotelsUseCase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(value = HotelController.class, properties = "tripwise.rate-limit.enabled=false")
@Import({SecurityConfig.class, GlobalExceptionHandler.class, JwtAuthenticationFilter.class, JwtAuthenticationEntryPoint.class})
class HotelControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SuggestHotelsUseCase suggestHotelsUseCase;

    @MockBean
    private JwtTokenService jwtTokenService;

    @MockBean
    private UserDetailsService userDetailsService;

    @Test
    @WithMockUser(username = "test@example.com")
    void suggestHotels_WithValidRequest_ShouldReturnSuggestions() throws Exception {
        when(suggestHotelsUseCase.execute(org.mockito.ArgumentMatchers.any()))
                .thenReturn(List.of(
                        HotelResponse.builder()
                                .id(1L)
                                .name("Sheraton Nha Trang Hotel & Spa")
                                .city("Nha Trang")
                                .priceLevel("HIGH")
                                .starRating(5)
                                .latitude(12.2472)
                                .longitude(109.2028)
                                .build()
                ));

        mockMvc.perform(get("/api/v1/hotels/suggestions")
                        .param("city", "Nha Trang")
                        .param("budget", "HIGH")
                        .param("starRating", "4"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Hotel suggestions fetched successfully"))
                .andExpect(jsonPath("$.data[0].name").value("Sheraton Nha Trang Hotel & Spa"))
                .andExpect(jsonPath("$.data[0].priceLevel").value("HIGH"))
                .andExpect(jsonPath("$.data[0].starRating").value(5))
                .andExpect(jsonPath("$.data[0].latitude").value(12.2472))
                .andExpect(jsonPath("$.data[0].longitude").value(109.2028));

        verify(suggestHotelsUseCase).execute(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void suggestHotels_WithoutAuthentication_ShouldReturn401() throws Exception {
        mockMvc.perform(get("/api/v1/hotels/suggestions")
                        .param("city", "Nha Trang"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "test@example.com")
    void suggestHotels_WithMissingCity_ShouldReturn400() throws Exception {
        mockMvc.perform(get("/api/v1/hotels/suggestions")
                        .param("budget", "LOW"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.details[0].field").value("city"));
    }

    @Test
    @WithMockUser(username = "test@example.com")
    void suggestHotels_WithInvalidStarRating_ShouldReturn400() throws Exception {
        mockMvc.perform(get("/api/v1/hotels/suggestions")
                        .param("city", "Nha Trang")
                        .param("starRating", "6"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.details[0].field").value("starRating"));
    }

    @Test
    @WithMockUser(username = "test@example.com")
    void suggestHotels_WithUnsupportedBudget_ShouldReturn400() throws Exception {
        doThrow(new BusinessException(
                "budget chi ho tro LOW, MEDIUM hoac HIGH",
                "VALIDATION_ERROR",
                HttpStatus.BAD_REQUEST
        )).when(suggestHotelsUseCase).execute(org.mockito.ArgumentMatchers.any());

        mockMvc.perform(get("/api/v1/hotels/suggestions")
                        .param("city", "Nha Trang")
                        .param("budget", "luxury"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.message").value("budget chi ho tro LOW, MEDIUM hoac HIGH"));
    }

    @Test
    @WithMockUser(username = "test@example.com")
    void suggestHotels_WhenNoHotelsMatch_ShouldReturnEmptyList() throws Exception {
        when(suggestHotelsUseCase.execute(org.mockito.ArgumentMatchers.any()))
                .thenReturn(List.of());

        mockMvc.perform(get("/api/v1/hotels/suggestions")
                        .param("city", "Nha Trang")
                        .param("budget", "LOW"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data").isEmpty());
    }
}
