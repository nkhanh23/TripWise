package com.tripwise.common.mapper;

import org.mapstruct.MapperConfig;
import org.mapstruct.ReportingPolicy;

/**
 * Base configuration for all MapStruct mappers in the application.
 * - componentModel = "spring": allows autowiring of mappers
 * - unmappedTargetPolicy = ReportingPolicy.IGNORE: ignores unmapped properties to prevent compilation errors
 */
@MapperConfig(
        componentModel = "spring",
        unmappedTargetPolicy = ReportingPolicy.IGNORE
)
public interface MapStructConfig {
}
