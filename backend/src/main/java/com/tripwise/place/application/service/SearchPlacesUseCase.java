package com.tripwise.place.application.service;

import com.tripwise.place.application.dto.PlaceResponse;
import com.tripwise.place.application.dto.SearchPlacesQuery;
import com.tripwise.place.application.mapper.PlaceMapper;
import com.tripwise.place.domain.entity.Place;
import com.tripwise.place.infrastructure.persistence.repository.PlaceRepository;
import com.tripwise.place.infrastructure.persistence.specification.PlaceSpecifications;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SearchPlacesUseCase {

    private final PlaceRepository placeRepository;
    private final PlaceMapper placeMapper;

    @Transactional(readOnly = true)
    public Page<PlaceResponse> execute(SearchPlacesQuery query, Pageable pageable) {
        Specification<Place> specification = Specification.where(PlaceSpecifications.isActiveAndVerified())
                .and(PlaceSpecifications.hasCity(query.getCity()))
                .and(PlaceSpecifications.hasCategoryId(query.getCategoryId()))
                .and(PlaceSpecifications.hasAnyTag(query.getTags()))
                .and(PlaceSpecifications.hasPriceLevel(query.getPriceLevel()))
                .and(PlaceSpecifications.matchesKeyword(query.getKeyword()));

        return placeRepository.findAll(specification, pageable)
                .map(placeMapper::toResponse);
    }
}
