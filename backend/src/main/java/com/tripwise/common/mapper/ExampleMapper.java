package com.tripwise.common.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(config = MapStructConfig.class)
public interface ExampleMapper {

    @Mapping(source = "fullName", target = "name")
    @Mapping(source = "emailAddress", target = "email")
    ExampleDto toDto(ExampleEntity entity);

    @Mapping(source = "name", target = "fullName")
    @Mapping(source = "email", target = "emailAddress")
    ExampleEntity toEntity(ExampleDto dto);
}
