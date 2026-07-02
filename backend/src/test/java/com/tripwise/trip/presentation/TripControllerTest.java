package com.tripwise.trip.presentation;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tripwise.auth.infrastructure.security.JwtAuthenticationEntryPoint;
import com.tripwise.auth.infrastructure.security.JwtAuthenticationFilter;
import com.tripwise.auth.infrastructure.security.JwtTokenService;
import com.tripwise.common.exception.ForbiddenException;
import com.tripwise.common.exception.GlobalExceptionHandler;
import com.tripwise.common.exception.ResourceNotFoundException;
import com.tripwise.common.security.SecurityConfig;
import com.tripwise.itinerary.application.dto.GeneratedItineraryResponse;
import com.tripwise.itinerary.application.dto.ItineraryDayResponse;
import com.tripwise.itinerary.application.dto.ItineraryItemResponse;
import com.tripwise.itinerary.application.dto.ItineraryResponse;
import com.tripwise.itinerary.application.service.GenerateItineraryUseCase;
import com.tripwise.itinerary.domain.TimeSlot;
import com.tripwise.place.application.dto.PlaceResponse;
import com.tripwise.transport.application.dto.TransportSuggestionResponse;
import com.tripwise.trip.application.dto.CreateTripRequest;
import com.tripwise.trip.application.dto.TripDetailResponse;
import com.tripwise.trip.application.dto.TripResponse;
import com.tripwise.trip.application.service.DeleteTripUseCase;
import com.tripwise.trip.application.service.GetTripDetailUseCase;
import com.tripwise.trip.application.service.ListUserTripsUseCase;
import com.tripwise.trip.domain.enums.TripStatus;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(value = TripController.class, properties = "tripwise.rate-limit.enabled=false")
@Import({SecurityConfig.class, GlobalExceptionHandler.class, JwtAuthenticationFilter.class, JwtAuthenticationEntryPoint.class})
class TripControllerTest {

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
    @WithMockUser(username = "test@example.com")
    void generateTrip_WithValidRequest_ShouldReturn201() throws Exception {
        // Arrange
        CreateTripRequest request = new CreateTripRequest("Tôi muốn đi Nha Trang 3 ngày");
        GeneratedItineraryResponse response = GeneratedItineraryResponse.builder()
                .id(1L)
                .destination("Nha Trang")
                .days(3)
                .nights(2)
                .interests(List.of("beach"))
                .status(TripStatus.GENERATED)
                .itineraryDays(List.of(ItineraryDayResponse.builder()
                        .dayNumber(1)
                        .dayTitle("Ngày 1")
                        .items(List.of(ItineraryItemResponse.builder()
                                .orderIndex(0)
                                .startTime(LocalTime.of(8, 0))
                                .endTime(LocalTime.of(10, 0))
                                .timeSlot(TimeSlot.MORNING)
                                .aiDescription("Phù hợp để bắt đầu ngày mới với không gian biển thoáng đãng.")
                                .estimatedCost(BigDecimal.ZERO)
                                .transportSuggestion(TransportSuggestionResponse.builder()
                                        .mode("WALK")
                                        .reason("Quang duong ngan, phu hop de di bo.")
                                        .build())
                                .place(PlaceResponse.builder()
                                        .id(10L)
                                        .name("Trần Phú Beach")
                                        .city("Nha Trang")
                                        .build())
                                .build()))
                        .build()))
                .build();

        when(generateItineraryUseCase.execute(eq("test@example.com"), any(CreateTripRequest.class)))
                .thenReturn(response);

        // Act & Assert
        mockMvc.perform(post("/api/v1/trips/generate")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Lên lịch trình thành công"))
                .andExpect(jsonPath("$.data.destination").value("Nha Trang"))
                .andExpect(jsonPath("$.data.days").value(3))
                .andExpect(jsonPath("$.data.nights").value(2))
                .andExpect(jsonPath("$.data.status").value("GENERATED"))
                .andExpect(jsonPath("$.data.itineraryDays[0].dayNumber").value(1))
                .andExpect(jsonPath("$.data.itineraryDays[0].items[0].place.name").value("Trần Phú Beach"))
                .andExpect(jsonPath("$.data.itineraryDays[0].items[0].aiDescription").value("Phù hợp để bắt đầu ngày mới với không gian biển thoáng đãng."));

        verify(generateItineraryUseCase).execute(eq("test@example.com"), any(CreateTripRequest.class));
    }

    @Test
    @WithMockUser(username = "test@example.com")
    void getMyTrips_WithValidRequest_ShouldReturnPaginatedTrips() throws Exception {
        // Arrange
        TripResponse trip = TripResponse.builder()
                .id(1L)
                .destination("Nha Trang")
                .days(3)
                .nights(2)
                .status(TripStatus.GENERATED)
                .build();

        when(listUserTripsUseCase.execute(eq("test@example.com"), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(trip), PageRequest.of(0, 20), 1));

        // Act & Assert
        mockMvc.perform(get("/api/v1/trips")
                        .param("page", "0")
                        .param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Lấy danh sách chuyến đi thành công"))
                .andExpect(jsonPath("$.data.page").value(0))
                .andExpect(jsonPath("$.data.size").value(20))
                .andExpect(jsonPath("$.data.totalElements").value(1))
                .andExpect(jsonPath("$.data.content[0].destination").value("Nha Trang"));

        verify(listUserTripsUseCase).execute(eq("test@example.com"), any(PageRequest.class));
    }

    @Test
    @WithMockUser(username = "test@example.com")
    void getMyTrips_ShouldClampInvalidPaginationValues() throws Exception {
        // Arrange
        when(listUserTripsUseCase.execute(eq("test@example.com"), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 100), 0));

        // Act & Assert
        mockMvc.perform(get("/api/v1/trips")
                        .param("page", "-5")
                        .param("size", "1000"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.page").value(0))
                .andExpect(jsonPath("$.data.size").value(100));
    }

    @Test
    void getMyTrips_WithoutAuthentication_ShouldReturn401() throws Exception {
        mockMvc.perform(get("/api/v1/trips"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "test@example.com")
    void getTripDetail_WithHappyPath_ShouldReturnDetail() throws Exception {
        // Arrange
        TripDetailResponse response = TripDetailResponse.builder()
                .id(100L)
                .destination("Nha Trang")
                .days(3)
                .nights(2)
                .status(TripStatus.GENERATED)
                .itinerary(ItineraryResponse.builder()
                        .days(List.of(ItineraryDayResponse.builder()
                                .dayNumber(1)
                                .items(List.of(ItineraryItemResponse.builder()
                                        .orderIndex(0)
                                        .aiDescription("Phù hợp để bắt đầu ngày với bãi biển trung tâm dễ tiếp cận.")
                                        .transportSuggestion(TransportSuggestionResponse.builder()
                                                .mode("TAXI")
                                                .reason("Quang duong tam trung, taxi thuan tien hon trong thanh pho.")
                                                .build())
                                        .place(PlaceResponse.builder()
                                                .id(10L)
                                                .name("Trần Phú Beach")
                                                .city("Nha Trang")
                                                .build())
                                        .build()))
                                .build()))
                        .build())
                .build();

        when(getTripDetailUseCase.execute("test@example.com", 100L)).thenReturn(response);

        // Act & Assert
        mockMvc.perform(get("/api/v1/trips/100"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Lấy chi tiết chuyến đi thành công"))
                .andExpect(jsonPath("$.data.destination").value("Nha Trang"))
                .andExpect(jsonPath("$.data.status").value("GENERATED"))
                .andExpect(jsonPath("$.data.itinerary.days[0].dayNumber").value(1))
                .andExpect(jsonPath("$.data.itinerary.days[0].items[0].place.name").value("Trần Phú Beach"))
                .andExpect(jsonPath("$.data.itinerary.days[0].items[0].aiDescription").value("Phù hợp để bắt đầu ngày với bãi biển trung tâm dễ tiếp cận."));

        verify(getTripDetailUseCase).execute("test@example.com", 100L);
    }

    @Test
    @WithMockUser(username = "test@example.com")
    void generateTrip_WhenTransportSuggestionExists_ShouldReturnItInResponse() throws Exception {
        CreateTripRequest request = new CreateTripRequest("Plan a beach trip");
        GeneratedItineraryResponse response = GeneratedItineraryResponse.builder()
                .id(2L)
                .destination("Nha Trang")
                .days(1)
                .nights(0)
                .interests(List.of("beach"))
                .status(TripStatus.GENERATED)
                .itineraryDays(List.of(ItineraryDayResponse.builder()
                        .dayNumber(1)
                        .items(List.of(ItineraryItemResponse.builder()
                                .orderIndex(0)
                                .transportSuggestion(TransportSuggestionResponse.builder()
                                        .mode("WALK")
                                        .reason("Short distance")
                                        .build())
                                .place(PlaceResponse.builder()
                                        .id(10L)
                                        .name("Tran Phu Beach")
                                        .city("Nha Trang")
                                        .build())
                                .build()))
                        .build()))
                .build();

        when(generateItineraryUseCase.execute(eq("test@example.com"), any(CreateTripRequest.class)))
                .thenReturn(response);

        mockMvc.perform(post("/api/v1/trips/generate")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.itineraryDays[0].items[0].transportSuggestion.mode").value("WALK"))
                .andExpect(jsonPath("$.data.itineraryDays[0].items[0].transportSuggestion.reason").value("Short distance"));
    }

    @Test
    @WithMockUser(username = "test@example.com")
    void getTripDetail_WhenTransportSuggestionExists_ShouldReturnItInResponse() throws Exception {
        TripDetailResponse response = TripDetailResponse.builder()
                .id(101L)
                .destination("Nha Trang")
                .days(1)
                .nights(0)
                .status(TripStatus.GENERATED)
                .itinerary(ItineraryResponse.builder()
                        .days(List.of(ItineraryDayResponse.builder()
                                .dayNumber(1)
                                .items(List.of(ItineraryItemResponse.builder()
                                        .orderIndex(0)
                                        .transportSuggestion(TransportSuggestionResponse.builder()
                                                .mode("TAXI")
                                                .reason("Medium distance")
                                                .build())
                                        .place(PlaceResponse.builder()
                                                .id(11L)
                                                .name("Po Nagar")
                                                .city("Nha Trang")
                                                .build())
                                        .build()))
                                .build()))
                        .build())
                .build();

        when(getTripDetailUseCase.execute("test@example.com", 101L)).thenReturn(response);

        mockMvc.perform(get("/api/v1/trips/101"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.itinerary.days[0].items[0].transportSuggestion.mode").value("TAXI"))
                .andExpect(jsonPath("$.data.itinerary.days[0].items[0].transportSuggestion.reason").value("Medium distance"));
    }

    @Test
    @WithMockUser(username = "test@example.com")
    void getTripDetail_NotFound_ShouldReturn404() throws Exception {
        // Arrange
        when(getTripDetailUseCase.execute("test@example.com", 100L))
                .thenThrow(new ResourceNotFoundException("Trip không tồn tại"));

        // Act & Assert
        mockMvc.perform(get("/api/v1/trips/100"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.errorCode").value("RESOURCE_NOT_FOUND"));
    }

    @Test
    @WithMockUser(username = "test@example.com")
    void getTripDetail_Forbidden_ShouldReturn403() throws Exception {
        // Arrange
        when(getTripDetailUseCase.execute("test@example.com", 100L))
                .thenThrow(new ForbiddenException("Bạn không có quyền truy cập thông tin chuyến đi này"));

        // Act & Assert
        mockMvc.perform(get("/api/v1/trips/100"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));
    }

    @Test
    void getTripDetail_WithoutAuthentication_ShouldReturn401() throws Exception {
        mockMvc.perform(get("/api/v1/trips/100"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "test@example.com")
    void generateTrip_WithEmptyRequest_ShouldReturn400() throws Exception {
        // Arrange
        CreateTripRequest request = new CreateTripRequest("");

        // Act & Assert
        mockMvc.perform(post("/api/v1/trips/generate")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.details[0].field").value("request"));
    }

    @Test
    void generateTrip_WithoutAuthentication_ShouldReturn401() throws Exception {
        // Arrange
        CreateTripRequest request = new CreateTripRequest("Tôi muốn đi Nha Trang 3 ngày");

        // Act & Assert
        mockMvc.perform(post("/api/v1/trips/generate")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "test@example.com")
    void deleteTrip_WithHappyPath_ShouldReturn200() throws Exception {
        // Act & Assert
        mockMvc.perform(delete("/api/v1/trips/100")
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Xóa chuyến đi thành công"));

        verify(deleteTripUseCase).execute("test@example.com", 100L);
    }

    @Test
    @WithMockUser(username = "test@example.com")
    void deleteTrip_NotFound_ShouldReturn404() throws Exception {
        // Arrange
        doThrow(new ResourceNotFoundException("Trip không tồn tại"))
                .when(deleteTripUseCase).execute("test@example.com", 100L);

        // Act & Assert
        mockMvc.perform(delete("/api/v1/trips/100")
                        .with(csrf()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.errorCode").value("RESOURCE_NOT_FOUND"));
    }

    @Test
    @WithMockUser(username = "test@example.com")
    void deleteTrip_Forbidden_ShouldReturn403() throws Exception {
        // Arrange
        doThrow(new ForbiddenException("Bạn không có quyền truy cập thông tin chuyến đi này"))
                .when(deleteTripUseCase).execute("test@example.com", 100L);

        // Act & Assert
        mockMvc.perform(delete("/api/v1/trips/100")
                        .with(csrf()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));
    }

    @Test
    void deleteTrip_WithoutAuthentication_ShouldReturn401() throws Exception {
        mockMvc.perform(delete("/api/v1/trips/100")
                        .with(csrf()))
                .andExpect(status().isUnauthorized());
    }
}
