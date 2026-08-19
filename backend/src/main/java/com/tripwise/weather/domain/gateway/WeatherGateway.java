package com.tripwise.weather.domain.gateway;

import com.tripwise.weather.domain.WeatherForecast;
import java.time.LocalDate;

/**
 * Output Port interface representing the weather service provider.
 * Follows the Dependency Inversion Principle of Clean Architecture.
 */
public interface WeatherGateway {
    
    /**
     * Retrieve weather forecast for the specified location and date range.
     *
     * @param latitude  Latitude of the target location
     * @param longitude Longitude of the target location
     * @param startDate Forecast start date
     * @param endDate   Forecast end date
     * @return WeatherForecast domain model containing forecast details
     */
    WeatherForecast getForecast(double latitude, double longitude, LocalDate startDate, LocalDate endDate);
}
