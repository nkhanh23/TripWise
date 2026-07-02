package com.tripwise.weather.application.service;

import com.tripwise.common.exception.BusinessException;
import com.tripwise.common.exception.ResourceNotFoundException;
import com.tripwise.place.domain.entity.Place;
import com.tripwise.place.infrastructure.persistence.repository.PlaceRepository;
import com.tripwise.weather.domain.WeatherForecast;
import lombok.RequiredArgsConstructor;
import org.locationtech.jts.geom.Point;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
@RequiredArgsConstructor
public class GetWeatherForecastByCityUseCase {

    private static final long MAX_FORECAST_DAYS = 16;

    private final PlaceRepository placeRepository;
    private final GetWeatherForecastUseCase getWeatherForecastUseCase;

    @Transactional(readOnly = true)
    public WeatherForecast execute(String city, LocalDate startDate, LocalDate endDate) {
        validateDateRange(startDate, endDate);

        List<Place> places = placeRepository.findAllByCityIgnoreCaseAndIsActiveTrueAndIsVerifiedTrue(city);
        if (places.isEmpty()) {
            throw new ResourceNotFoundException("Khong tim thay du lieu dia diem da xac minh cho thanh pho nay");
        }

        List<Point> points = places.stream()
                .map(Place::getLocation)
                .filter(location -> location != null)
                .toList();

        if (points.isEmpty()) {
            throw new ResourceNotFoundException("Khong tim thay toa do hop le de lay du bao thoi tiet");
        }

        double latitude = points.stream().mapToDouble(Point::getY).average().orElseThrow();
        double longitude = points.stream().mapToDouble(Point::getX).average().orElseThrow();

        return getWeatherForecastUseCase.execute(city, latitude, longitude, startDate, endDate);
    }

    private void validateDateRange(LocalDate startDate, LocalDate endDate) {
        if (startDate == null || endDate == null) {
            throw new BusinessException("startDate va endDate khong duoc de trong",
                    "VALIDATION_ERROR", HttpStatus.BAD_REQUEST);
        }
        if (endDate.isBefore(startDate)) {
            throw new BusinessException("endDate phai lon hon hoac bang startDate",
                    "VALIDATION_ERROR", HttpStatus.BAD_REQUEST);
        }
        long days = ChronoUnit.DAYS.between(startDate, endDate) + 1;
        if (days > MAX_FORECAST_DAYS) {
            throw new BusinessException("Khoang du bao khong duoc vuot qua 16 ngay",
                    "VALIDATION_ERROR", HttpStatus.BAD_REQUEST);
        }
    }
}
