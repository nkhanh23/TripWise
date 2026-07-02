package com.tripwise.trip.application.mapper;

import com.tripwise.trip.application.dto.TripDetailResponse;
import com.tripwise.trip.application.dto.TripResponse;
import com.tripwise.trip.domain.entity.Trip;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface TripMapper {
    TripResponse toResponse(Trip trip);

    @Mapping(target = "itinerary", ignore = true)
    TripDetailResponse toDetailResponse(Trip trip);
}
