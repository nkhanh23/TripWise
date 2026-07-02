package com.tripwise.itinerary.application.mapper;

import com.tripwise.itinerary.application.dto.ItineraryItemResponse;
import com.tripwise.itinerary.domain.TimeSlot;
import com.tripwise.itinerary.domain.entity.ItineraryItem;
import com.tripwise.place.application.dto.PlaceResponse;
import com.tripwise.place.application.mapper.PlaceMapper;
import com.tripwise.place.domain.entity.Place;
import com.tripwise.transport.application.service.TransportSuggestionService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ItineraryResponseMapperTest {

    @Mock
    private PlaceMapper placeMapper;

    @Mock
    private TransportSuggestionService transportSuggestionService;

    @InjectMocks
    private ItineraryResponseMapper itineraryResponseMapper;

    @Test
    void toItemResponse_ShouldIncludeTransportSuggestionForMappedDistance() {
        Place place = Place.builder()
                .id(10L)
                .name("Tran Phu Beach")
                .build();
        ItineraryItem itineraryItem = ItineraryItem.builder()
                .orderIndex(1)
                .place(place)
                .timeSlot(TimeSlot.AFTERNOON)
                .startTime(LocalTime.of(14, 0))
                .endTime(LocalTime.of(15, 30))
                .estimatedCost(BigDecimal.ZERO)
                .distanceFromPreviousMeters(4_500)
                .durationFromPreviousSeconds(900)
                .build();

        when(placeMapper.toResponse(place)).thenReturn(PlaceResponse.builder().id(10L).name("Tran Phu Beach").build());
        when(transportSuggestionService.suggest(4_500))
                .thenReturn(com.tripwise.transport.application.dto.TransportSuggestionResponse.builder()
                        .mode("TAXI")
                        .reason("Quang duong tam trung, taxi thuan tien hon trong thanh pho.")
                        .build());

        ItineraryItemResponse response = itineraryResponseMapper.toItemResponse(itineraryItem);

        assertThat(response.getDistanceFromPreviousMeters()).isEqualTo(4_500);
        assertThat(response.getTransportSuggestion()).isNotNull();
        assertThat(response.getTransportSuggestion().getMode()).isEqualTo("TAXI");
        assertThat(response.getPlace().getName()).isEqualTo("Tran Phu Beach");
    }

    @Test
    void toItemResponse_ShouldLeaveTransportSuggestionNullForFirstStop() {
        Place place = Place.builder()
                .id(11L)
                .name("Long Son Pagoda")
                .build();
        ItineraryItem itineraryItem = ItineraryItem.builder()
                .orderIndex(0)
                .place(place)
                .timeSlot(TimeSlot.MORNING)
                .startTime(LocalTime.of(8, 0))
                .endTime(LocalTime.of(9, 0))
                .estimatedCost(BigDecimal.ZERO)
                .distanceFromPreviousMeters(0)
                .durationFromPreviousSeconds(0)
                .build();

        when(placeMapper.toResponse(place)).thenReturn(PlaceResponse.builder().id(11L).name("Long Son Pagoda").build());
        when(transportSuggestionService.suggest(0)).thenReturn(null);

        ItineraryItemResponse response = itineraryResponseMapper.toItemResponse(itineraryItem);

        assertThat(response.getTransportSuggestion()).isNull();
        assertThat(response.getPlace().getName()).isEqualTo("Long Son Pagoda");
    }
}
