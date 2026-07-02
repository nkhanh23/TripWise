package com.tripwise.hotel.application.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
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
public class HotelSuggestionQuery {

    @NotBlank(message = "city must not be blank")
    private String city;

    private String budget;

    @Min(value = 1, message = "starRating must be greater than or equal to 1")
    @Max(value = 5, message = "starRating must be less than or equal to 5")
    private Integer starRating;
}
