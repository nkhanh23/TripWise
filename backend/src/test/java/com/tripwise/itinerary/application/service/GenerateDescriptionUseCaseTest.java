package com.tripwise.itinerary.application.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tripwise.ai.infrastructure.GeminiClient;
import com.tripwise.itinerary.domain.TimeSlot;
import com.tripwise.itinerary.domain.entity.ItineraryDay;
import com.tripwise.itinerary.domain.entity.ItineraryItem;
import com.tripwise.itinerary.infrastructure.persistence.repository.ItineraryItemRepository;
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
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GenerateDescriptionUseCaseTest {

    @Mock
    private GeminiClient geminiClient;

    @Mock
    private ItineraryItemRepository itineraryItemRepository;

    private GenerateDescriptionUseCase generateDescriptionUseCase;

    @BeforeEach
    void setUp() {
        generateDescriptionUseCase = new GenerateDescriptionUseCase(
                geminiClient,
                new ObjectMapper(),
                itineraryItemRepository
        );
    }

    @Test
    void execute_ShouldPopulateAiDescriptionsFromGeminiJson() {
        Trip trip = Trip.builder()
                .id(1L)
                .destination("Nha Trang")
                .days(1)
                .budget("BUDGET")
                .interests(List.of("bien", "am thuc"))
                .build();

        PlaceCategory category = PlaceCategory.builder().name("Bien").slug("beach").build();
        Place place = Place.builder()
                .name("Tran Phu Beach")
                .category(category)
                .description("Bai bien trung tam")
                .tags(Set.of("beach", "city-center"))
                .build();

        ItineraryItem item = ItineraryItem.builder()
                .orderIndex(0)
                .timeSlot(TimeSlot.MORNING)
                .reason("Tran Phu Beach - ly tuong cho buoi sang")
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
                            "aiDescription": "Phu hop de bat dau ngay moi voi khong gian bien thoang dang, de dao choi va gan trung tam Nha Trang."
                          }
                        ]
                        """);

        generateDescriptionUseCase.execute(trip, List.of(day));

        assertThat(item.getAiDescription())
                .isEqualTo("Phu hop de bat dau ngay moi voi khong gian bien thoang dang, de dao choi va gan trung tam Nha Trang.");
        verify(itineraryItemRepository).saveAll(anyList());
    }

    @Test
    void execute_WhenGeminiFails_ShouldKeepDescriptionsEmpty() {
        Trip trip = Trip.builder().id(1L).destination("Nha Trang").days(1).build();
        ItineraryItem item = ItineraryItem.builder()
                .orderIndex(0)
                .timeSlot(TimeSlot.MORNING)
                .place(Place.builder().name("Tran Phu Beach").build())
                .build();
        ItineraryDay day = ItineraryDay.builder().dayNumber(1).items(List.of(item)).build();

        when(geminiClient.generateContent(org.mockito.ArgumentMatchers.anyString()))
                .thenThrow(new RuntimeException("timeout"));

        generateDescriptionUseCase.execute(trip, List.of(day));

        assertThat(item.getAiDescription()).isNull();
        verify(itineraryItemRepository, never()).saveAll(anyList());
    }

    @Test
    void execute_WhenGeminiReturnsInvalidJson_ShouldKeepDescriptionsEmpty() {
        Trip trip = Trip.builder().id(1L).destination("Nha Trang").days(1).build();
        ItineraryItem item = ItineraryItem.builder()
                .orderIndex(0)
                .timeSlot(TimeSlot.MORNING)
                .place(Place.builder().name("Tran Phu Beach").build())
                .build();
        ItineraryDay day = ItineraryDay.builder().dayNumber(1).items(List.of(item)).build();

        when(geminiClient.generateContent(org.mockito.ArgumentMatchers.anyString()))
                .thenReturn("khong phai json");

        generateDescriptionUseCase.execute(trip, List.of(day));

        assertThat(item.getAiDescription()).isNull();
        verify(itineraryItemRepository, never()).saveAll(anyList());
    }
}
