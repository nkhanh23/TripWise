package com.tripwise.trip.application.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateTripRequest {
    @NotBlank(message = "Yêu cầu chuyến đi không được để trống")
    private String request;
}
