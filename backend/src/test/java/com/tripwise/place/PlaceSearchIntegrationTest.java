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
    void shouldSearchPlacesByCityAndKeyword() {
        JsonNode response = restTemplate.getForObject(
                "/api/v1/places?city=Nha%20Trang&keyword=Long&page=0&size=10",
                JsonNode.class
        );

        assertThat(response.path("success").asBoolean()).isTrue();
        assertThat(response.path("data").path("content")).isNotEmpty();
        assertThat(response.path("data").path("content").get(0).path("name").asText())
                .isEqualTo("Chùa Long Sơn");
    }

    @Test
    void shouldFilterPlacesByTagAndPriceLevel() {
        JsonNode response = restTemplate.getForObject(
                "/api/v1/places?tags=night-market&priceLevel=LOW&page=0&size=10",
                JsonNode.class
        );

        assertThat(response.path("success").asBoolean()).isTrue();
        assertThat(response.path("data").path("content")).hasSize(1);
        assertThat(response.path("data").path("content").get(0).path("name").asText())
                .isEqualTo("Chợ đêm Nha Trang");
        assertThat(response.path("data").path("content").get(0).path("priceLevel").asText())
                .isEqualTo("LOW");
    }
}
