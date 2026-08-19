package com.tripwise.weather.application.mapper;

import com.tripwise.common.mapper.MapStructConfig;
import com.tripwise.weather.application.dto.WeatherSummaryDto;
import com.tripwise.weather.domain.WeatherForecast;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

/**
 * MapStruct mapper for converting Weather domain models to Application DTOs.
 * Uses MapStructConfig for Spring component model alignment.
 */
@Mapper(config = MapStructConfig.class)
public interface WeatherMapper {

    WeatherSummaryDto toSummaryDto(WeatherForecast weatherForecast);

    @Mapping(target = "tempMin", source = "temperatureMinCelsius")
    @Mapping(target = "tempMax", source = "temperatureMaxCelsius")
    @Mapping(target = "rainProb", source = "precipitationProbabilityMax")
    WeatherSummaryDto.DailyWeatherSummary toDailySummary(WeatherForecast.DailyForecast dailyForecast);
}
