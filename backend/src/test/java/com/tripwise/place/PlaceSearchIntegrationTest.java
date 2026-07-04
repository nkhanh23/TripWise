package com.tripwise.place;

import com.fasterxml.jackson.databind.JsonNode;
import com.tripwise.BaseIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;

import static org.assertj.core.api.Assertions.assertThat;

class PlaceSearchIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    void shouldSearchPlacesByProvinceAndKeywordWithMapReadyFields() {
        JsonNode response = restTemplate.getForObject(
                "/api/v1/places?province=Khanh%20Hoa&city=Nha%20Trang&keyword=Long&page=0&size=10&sortBy=popularityScore&sortDirection=desc",
                JsonNode.class
        );

        assertThat(response.path("success").asBoolean()).isTrue();
        assertThat(response.path("data").path("content")).isNotEmpty();

        JsonNode firstPlace = response.path("data").path("content").get(0);
        assertThat(firstPlace.path("name").asText()).containsIgnoringCase("Long");
        assertThat(firstPlace.path("province").asText()).isEqualTo("Khanh Hoa");
        assertThat(firstPlace.path("city").asText()).isEqualTo("Nha Trang");
        assertThat(firstPlace.has("verificationStatus")).isTrue();
        assertThat(firstPlace.has("popularityScore")).isTrue();
        assertThat(firstPlace.has("primaryImageUrl")).isTrue();
    }

    @Test
    void shouldFilterPlacesByVerificationStatusAndMinRating() {
        JsonNode response = restTemplate.getForObject(
                "/api/v1/places?verificationStatus=VERIFIED&minRating=4.0&page=0&size=10&sortBy=rating&sortDirection=desc",
                JsonNode.class
        );

        assertThat(response.path("success").asBoolean()).isTrue();
        assertThat(response.path("data").path("content")).isNotEmpty();
        response.path("data").path("content").forEach(place -> {
            assertThat(place.path("verificationStatus").asText()).isEqualTo("VERIFIED");
            assertThat(place.path("rating").decimalValue()).isGreaterThanOrEqualTo(new java.math.BigDecimal("4.0"));
        });
    }

    @Test
    void shouldSearchPlacesWhenOptionalFiltersAreOmitted() {
        JsonNode response = restTemplate.getForObject(
                "/api/v1/places?page=0&size=5&sortBy=name&sortDirection=asc",
                JsonNode.class
        );

        assertThat(response.path("success").asBoolean()).isTrue();
        assertThat(response.path("message").asText()).isEqualTo("Places fetched successfully");
        assertThat(response.path("data").path("content")).isNotEmpty();
        assertThat(response.path("data").path("size").asInt()).isEqualTo(5);
    }
}
