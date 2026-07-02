package com.tripwise.transport.application.service;

import com.tripwise.transport.application.dto.TransportSuggestionResponse;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class TransportSuggestionServiceTest {

    private final TransportSuggestionService transportSuggestionService = new TransportSuggestionService();

    @Test
    void suggest_WhenDistanceIsNull_ShouldReturnNull() {
        assertThat(transportSuggestionService.suggest(null)).isNull();
    }

    @Test
    void suggest_WhenDistanceIsZeroOrNegative_ShouldReturnNull() {
        assertThat(transportSuggestionService.suggest(0)).isNull();
        assertThat(transportSuggestionService.suggest(-50)).isNull();
    }

    @Test
    void suggest_WhenDistanceIsBelowOneKilometer_ShouldSuggestWalk() {
        TransportSuggestionResponse response = transportSuggestionService.suggest(999);

        assertThat(response.getMode()).isEqualTo("WALK");
        assertThat(response.getReason()).contains("di bo");
    }

    @Test
    void suggest_WhenDistanceIsBetweenOneAndTenKilometers_ShouldSuggestTaxi() {
        TransportSuggestionResponse response = transportSuggestionService.suggest(5_000);

        assertThat(response.getMode()).isEqualTo("TAXI");
        assertThat(response.getReason()).contains("taxi");
    }

    @Test
    void suggest_WhenDistanceIsExactlyOneKilometer_ShouldSuggestTaxi() {
        TransportSuggestionResponse response = transportSuggestionService.suggest(1_000);

        assertThat(response.getMode()).isEqualTo("TAXI");
    }

    @Test
    void suggest_WhenDistanceIsTenKilometersOrMore_ShouldSuggestBus() {
        TransportSuggestionResponse response = transportSuggestionService.suggest(10_000);

        assertThat(response.getMode()).isEqualTo("BUS");
        assertThat(response.getReason()).contains("tiet kiem chi phi");
    }
}
