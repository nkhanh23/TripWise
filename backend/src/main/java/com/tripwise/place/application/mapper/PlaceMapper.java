package com.tripwise.place.application.mapper;

import com.tripwise.common.mapper.MapStructConfig;
import com.tripwise.place.application.dto.PlaceDetailResponse;
import com.tripwise.place.application.dto.PlaceResponse;
import com.tripwise.place.domain.entity.Place;
import org.locationtech.jts.geom.Point;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(config = MapStructConfig.class)
public interface PlaceMapper {

    @Mapping(target = "categoryId", source = "category.id")
    @Mapping(target = "categoryName", source = "category.name")
    @Mapping(target = "categorySlug", source = "category.slug")
    @Mapping(target = "verified", source = "isVerified")
    @Mapping(target = "latitude", expression = "java(extractLatitude(place.getLocation()))")
    @Mapping(target = "longitude", expression = "java(extractLongitude(place.getLocation()))")
    PlaceResponse toResponse(Place place);

    @Mapping(target = "categoryId", source = "category.id")
    @Mapping(target = "categoryName", source = "category.name")
    @Mapping(target = "categorySlug", source = "category.slug")
    @Mapping(target = "verified", source = "isVerified")
    @Mapping(target = "latitude", expression = "java(extractLatitude(place.getLocation()))")
    @Mapping(target = "longitude", expression = "java(extractLongitude(place.getLocation()))")
    PlaceDetailResponse toDetailResponse(Place place);

    default Double extractLatitude(Point point) {
        return point == null ? null : point.getY();
    }

    default Double extractLongitude(Point point) {
        return point == null ? null : point.getX();
    }
}
