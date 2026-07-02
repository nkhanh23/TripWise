package com.tripwise.hotel.application.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HotelResponse {

    private Long id;
    private String name;
    private String city;
    private String priceLevel;
    private Integer starRating;
    private String googleMapsUrl;
    private String description;
    private Double latitude;
    private Double longitude;
}
