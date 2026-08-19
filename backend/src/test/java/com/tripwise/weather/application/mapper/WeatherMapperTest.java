package com.tripwise.weather.application.mapper;

import com.tripwise.weather.application.dto.WeatherSummaryDto;
import com.tripwise.weather.domain.WeatherForecast;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(classes = {WeatherMapperImpl.class})
class WeatherMapperTest {

    @MockBean
    private JpaMetamodelMappingContext jpaMappingContext;

    @Autowired
    private WeatherMapper weatherMapper;

    @Test
    void shouldMapWeatherForecastToWeatherSummaryDto() {
        // Arrange
        LocalDate date1 = LocalDate.of(2026, 7, 10);
        LocalDate date2 = LocalDate.of(2026, 7, 11);

        WeatherForecast.DailyForecast daily1 = new WeatherForecast.DailyForecast(
                date1, 24.5, 32.0, 80, 61
        );
        WeatherForecast.DailyForecast daily2 = new WeatherForecast.DailyForecast(
                date2, 25.0, 31.5, 20, 1
        );

        WeatherForecast forecast = new WeatherForecast(
                12.248, 109.196, "Asia/Ho_Chi_Minh", List.of(daily1, daily2)
        );

        // Act
        WeatherSummaryDto dto = weatherMapper.toSummaryDto(forecast);

        // Assert
        assertThat(dto).isNotNull();
        assertThat(dto.latitude()).isEqualTo(12.248);
        assertThat(dto.longitude()).isEqualTo(109.196);
        assertThat(dto.timezone()).isEqualTo("Asia/Ho_Chi_Minh");
        assertThat(dto.dailyForecasts()).hasSize(2);

        WeatherSummaryDto.DailyWeatherSummary summary1 = dto.dailyForecasts().get(0);
        assertThat(summary1.date()).isEqualTo(date1);
        assertThat(summary1.tempMin()).isEqualTo(24.5);
        assertThat(summary1.tempMax()).isEqualTo(32.0);
        assertThat(summary1.rainProb()).isEqualTo(80);
        assertThat(summary1.weatherCode()).isEqualTo(61);

        WeatherSummaryDto.DailyWeatherSummary summary2 = dto.dailyForecasts().get(1);
        assertThat(summary2.date()).isEqualTo(date2);
        assertThat(summary2.tempMin()).isEqualTo(25.0);
        assertThat(summary2.tempMax()).isEqualTo(31.5);
        assertThat(summary2.rainProb()).isEqualTo(20);
        assertThat(summary2.weatherCode()).isEqualTo(1);
    }
}
