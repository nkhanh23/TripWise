package com.tripwise.weather.presentation;

import com.tripwise.auth.infrastructure.security.JwtAuthenticationEntryPoint;
import com.tripwise.auth.infrastructure.security.JwtAuthenticationFilter;
import com.tripwise.auth.infrastructure.security.JwtTokenService;
import com.tripwise.common.exception.GlobalExceptionHandler;
import com.tripwise.common.exception.ResourceNotFoundException;
import com.tripwise.common.security.SecurityConfig;
import com.tripwise.weather.application.service.GetWeatherForecastByCityUseCase;
import com.tripwise.weather.domain.WeatherForecast;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.List;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.doThrow;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(value = WeatherController.class, properties = "tripwise.rate-limit.enabled=false")
@Import({SecurityConfig.class, GlobalExceptionHandler.class, JwtAuthenticationFilter.class, JwtAuthenticationEntryPoint.class})
class WeatherControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private GetWeatherForecastByCityUseCase getWeatherForecastByCityUseCase;

    @MockBean
    private JwtTokenService jwtTokenService;

    @MockBean
    private UserDetailsService userDetailsService;

    @Test
    @WithMockUser(username = "test@example.com")
    void getWeatherForecast_WithValidRequest_ShouldReturnForecast() throws Exception {
        when(getWeatherForecastByCityUseCase.execute("Nha Trang",
                LocalDate.of(2026, 7, 10), LocalDate.of(2026, 7, 11)))
                .thenReturn(new WeatherForecast(
                        12.25,
                        109.2,
                        "Asia/Bangkok",
                        List.of(
                                new WeatherForecast.DailyForecast(LocalDate.of(2026, 7, 10), 25, 30, 20, 1),
                                new WeatherForecast.DailyForecast(LocalDate.of(2026, 7, 11), 24, 29, 55, 61)
                        )
                ));

        mockMvc.perform(get("/api/v1/weather/{city}", "Nha Trang")
                        .param("startDate", "2026-07-10")
                        .param("endDate", "2026-07-11"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Weather forecast retrieved successfully"))
                .andExpect(jsonPath("$.data.city").value("Nha Trang"))
                .andExpect(jsonPath("$.data.latitude").value(12.25))
                .andExpect(jsonPath("$.data.longitude").value(109.2))
                .andExpect(jsonPath("$.data.timezone").value("Asia/Bangkok"))
                .andExpect(jsonPath("$.data.startDate").value("2026-07-10"))
                .andExpect(jsonPath("$.data.endDate").value("2026-07-11"))
                .andExpect(jsonPath("$.data.dailyForecasts[0].date").value("2026-07-10"))
                .andExpect(jsonPath("$.data.dailyForecasts[1].weatherCode").value(61));

        verify(getWeatherForecastByCityUseCase).execute("Nha Trang",
                LocalDate.of(2026, 7, 10), LocalDate.of(2026, 7, 11));
    }

    @Test
    void getWeatherForecast_WithoutAuthentication_ShouldReturn401() throws Exception {
        mockMvc.perform(get("/api/v1/weather/{city}", "Nha Trang")
                        .param("startDate", "2026-07-10")
                        .param("endDate", "2026-07-11"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "test@example.com")
    void getWeatherForecast_WithMissingStartDate_ShouldReturn400() throws Exception {
        mockMvc.perform(get("/api/v1/weather/{city}", "Nha Trang")
                        .param("endDate", "2026-07-11"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.details[0].field").value("startDate"));
    }

    @Test
    @WithMockUser(username = "test@example.com")
    void getWeatherForecast_WithBlankCity_ShouldReturn400() throws Exception {
        mockMvc.perform(get("/api/v1/weather/{city}", " ")
                        .param("startDate", "2026-07-10")
                        .param("endDate", "2026-07-11"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    @Test
    @WithMockUser(username = "test@example.com")
    void getWeatherForecast_WhenCityHasNoVerifiedPlaces_ShouldReturn404() throws Exception {
        doThrow(new ResourceNotFoundException("Khong tim thay du lieu dia diem da xac minh cho thanh pho nay"))
                .when(getWeatherForecastByCityUseCase)
                .execute("Unknown City", LocalDate.of(2026, 7, 10), LocalDate.of(2026, 7, 11));

        mockMvc.perform(get("/api/v1/weather/{city}", "Unknown City")
                        .param("startDate", "2026-07-10")
                        .param("endDate", "2026-07-11"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.errorCode").value("RESOURCE_NOT_FOUND"));
    }
}
