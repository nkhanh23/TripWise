package com.tripwise.itinerary.application.service;

import com.tripwise.itinerary.application.dto.ItineraryResponse;
import com.tripwise.itinerary.application.mapper.ItineraryResponseMapper;
import com.tripwise.itinerary.domain.entity.ItineraryDay;
import com.tripwise.itinerary.infrastructure.persistence.service.ItineraryPersistenceService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class GetItineraryDetailUseCase {

    private final ItineraryPersistenceService itineraryPersistenceService;
    private final ItineraryResponseMapper itineraryResponseMapper;

    @Transactional(readOnly = true)
    public ItineraryResponse execute(Long tripId) {
        List<ItineraryDay> itineraryDays = itineraryPersistenceService.getItineraryByTripIdWithPlaces(tripId);
        return itineraryResponseMapper.toResponse(itineraryDays);
    }
}
