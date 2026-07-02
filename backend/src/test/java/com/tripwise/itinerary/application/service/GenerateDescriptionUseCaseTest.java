package com.tripwise.itinerary.application.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tripwise.ai.infrastructure.GeminiClient;
import com.tripwise.itinerary.domain.TimeSlot;
import com.tripwise.itinerary.domain.entity.ItineraryDay;
import com.tripwise.itinerary.domain.entity.ItineraryItem;
import com.tripwise.place.domain.entity.Place;
import com.tripwise.place.domain.entity.PlaceCategory;
import com.tripwise.trip.domain.entity.Trip;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GenerateDescriptionUseCaseTest {

    @Mock
    private GeminiClient geminiClient;

    private GenerateDescriptionUseCase generateDescriptionUseCase;

    @BeforeEach
    void setUp() {
        generateDescriptionUseCase = new GenerateDescriptionUseCase(geminiClient, new ObjectMapper());
    }

    @Test
    void execute_ShouldPopulateAiDescriptionsFromGeminiJson() {
        Trip trip = Trip.builder()
                .id(1L)
                .destination("Nha Trang")
                .days(1)
                .budget("BUDGET")
                .interests(List.of("biển", "ẩm thực"))
                .build();

        PlaceCategory category = PlaceCategory.builder().name("Biển").slug("beach").build();
        Place place = Place.builder()
                .name("Trần Phú Beach")
                .category(category)
                .description("Bãi biển trung tâm")
                .tags(Set.of("beach", "city-center"))
                .build();

        ItineraryItem item = ItineraryItem.builder()
                .orderIndex(0)
                .timeSlot(TimeSlot.MORNING)
                .reason("Trần Phú Beach - lý tưởng cho buổi sáng")
                .estimatedCost(BigDecimal.ZERO)
                .place(place)
                .build();

        ItineraryDay day = ItineraryDay.builder()
                .dayNumber(1)
                .items(List.of(item))
                .build();

        when(geminiClient.generateContent(org.mockito.ArgumentMatchers.anyString()))
                .thenReturn("""
                        [
                          {
                            "dayNumber": 1,
                            "orderIndex": 0,
                            "aiDescription": "Phù hợp để bắt đầu ngày mới với không gian biển thoáng đãng, dễ dạo chơi và gần trung tâm Nha Trang."
                          }
                        ]
                        """);

        generateDescriptionUseCase.execute(trip, List.of(day));

        assertThat(item.getAiDescription())
                .isEqualTo("Phù hợp để bắt đầu ngày mới với không gian biển thoáng đãng, dễ dạo chơi và gần trung tâm Nha Trang.");
    }

    @Test
    void execute_WhenGeminiFails_ShouldKeepDescriptionsEmpty() {
        Trip trip = Trip.builder().id(1L).destination("Nha Trang").days(1).build();
        ItineraryItem item = ItineraryItem.builder()
                .orderIndex(0)
                .timeSlot(TimeSlot.MORNING)
                .place(Place.builder().name("Trần Phú Beach").build())
                .build();
        ItineraryDay day = ItineraryDay.builder().dayNumber(1).items(List.of(item)).build();

        when(geminiClient.generateContent(org.mockito.ArgumentMatchers.anyString()))
                .thenThrow(new RuntimeException("timeout"));

        generateDescriptionUseCase.execute(trip, List.of(day));

        assertThat(item.getAiDescription()).isNull();
    }

    @Test
    void execute_WhenGeminiReturnsInvalidJson_ShouldKeepDescriptionsEmpty() {
        Trip trip = Trip.builder().id(1L).destination("Nha Trang").days(1).build();
        ItineraryItem item = ItineraryItem.builder()
                .orderIndex(0)
                .timeSlot(TimeSlot.MORNING)
                .place(Place.builder().name("Trần Phú Beach").build())
                .build();
        ItineraryDay day = ItineraryDay.builder().dayNumber(1).items(List.of(item)).build();

        when(geminiClient.generateContent(org.mockito.ArgumentMatchers.anyString()))
                .thenReturn("không phải json");

        generateDescriptionUseCase.execute(trip, List.of(day));

        assertThat(item.getAiDescription()).isNull();
    }
}
