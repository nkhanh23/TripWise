import type MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { DailyWeather, WeatherForecast } from '../../integration/contracts';
import type { WeatherRepository } from '../../integration/repositories';
import type { TripDayItinerary, TripDetailData } from './types';

export type WeatherBadgeData = {
  iconName: keyof typeof MaterialIcons.glyphMap;
  temperatureLabel: string;
  precipitationLabel?: string;
  conditionDescription: string;
};

export function mapWmoCodeToWeatherInfo(
  weatherCode: number | null,
  maxTemp: number | null,
  minTemp: number | null,
  precipitationProb: number | null
): WeatherBadgeData | null {
  if (maxTemp === null && minTemp === null) return null;

  let iconName: keyof typeof MaterialIcons.glyphMap = 'wb-sunny';
  let conditionDescription = 'Sunny';

  if (weatherCode === 0) {
    iconName = 'wb-sunny';
    conditionDescription = 'Clear sky';
  } else if (weatherCode === 1 || weatherCode === 2 || weatherCode === 3) {
    iconName = 'cloud';
    conditionDescription = 'Partly cloudy';
  } else if (weatherCode === 45 || weatherCode === 48) {
    iconName = 'foggy' as keyof typeof MaterialIcons.glyphMap;
    conditionDescription = 'Foggy';
  } else if (
    (weatherCode !== null && weatherCode >= 51 && weatherCode <= 67) ||
    (weatherCode !== null && weatherCode >= 80 && weatherCode <= 82)
  ) {
    iconName = 'grain';
    conditionDescription = 'Rain';
  } else if (
    (weatherCode !== null && weatherCode >= 71 && weatherCode <= 77) ||
    (weatherCode !== null && weatherCode >= 85 && weatherCode <= 86)
  ) {
    iconName = 'ac-unit';
    conditionDescription = 'Snow';
  } else if (weatherCode !== null && weatherCode >= 95 && weatherCode <= 99) {
    iconName = 'flash-on';
    conditionDescription = 'Thunderstorm';
  }

  const max = maxTemp !== null ? `${Math.round(maxTemp)}°` : '';
  const min = minTemp !== null ? `${Math.round(minTemp)}°` : '';
  const temperatureLabel = max && min ? `${max} / ${min}` : max || min;

  const precipitationLabel =
    precipitationProb !== null && precipitationProb > 0
      ? `${Math.round(precipitationProb)}%`
      : undefined;

  return {
    iconName,
    temperatureLabel,
    precipitationLabel,
    conditionDescription,
  };
}

function extractVerifiedCoordinates(tripData: TripDetailData | null): { latitude: number; longitude: number } | null {
  if (!tripData?.days) return null;
  for (const day of tripData.days) {
    for (const item of day.items) {
      if (
        item.resolution === 'VERIFIED' &&
        typeof item.latitude === 'number' &&
        typeof item.longitude === 'number' &&
        Number.isFinite(item.latitude) &&
        Number.isFinite(item.longitude)
      ) {
        return { latitude: item.latitude, longitude: item.longitude };
      }
    }
  }
  return null;
}

function computeForecastDays(tripData: TripDetailData | null): number {
  if (!tripData) return 7;
  const daysCount = tripData.durationDays || (tripData.days ? tripData.days.length : 7);
  return Math.min(16, Math.max(1, daysCount));
}

export function useTripWeather(
  tripData: TripDetailData | null,
  activeDay: TripDayItinerary | null,
  weatherRepository?: WeatherRepository
) {
  const [fetchedForecast, setFetchedForecast] = useState<WeatherForecast | null>(null);
  const activeController = useRef<AbortController | null>(null);

  const coordinates = useMemo(() => extractVerifiedCoordinates(tripData), [tripData]);
  const forecastDays = useMemo(() => computeForecastDays(tripData), [tripData]);

  const forecast = coordinates ? fetchedForecast : null;

  useEffect(() => {
    if (!weatherRepository || !coordinates) {
      return;
    }

    const controller = new AbortController();
    activeController.current = controller;

    async function loadWeather() {
      try {
        const result = await weatherRepository!.getForecast(
          {
            latitude: coordinates!.latitude,
            longitude: coordinates!.longitude,
            forecastDays,
          },
          controller.signal
        );
        if (!controller.signal.aborted) {
          setFetchedForecast(result);
        }
      } catch {
        if (!controller.signal.aborted) {
          setFetchedForecast(null);
        }
      }
    }

    void loadWeather();

    return () => {
      controller.abort();
    };
  }, [weatherRepository, coordinates, forecastDays]);

  // Derive weather badge for the currently selected active day
  const activeDayWeather: WeatherBadgeData | null = useMemo(() => {
    if (!forecast || !forecast.days || !activeDay?.date) return null;
    const matchingDay: DailyWeather | undefined = forecast.days.find(
      (d) => d.date === activeDay.date
    );
    if (!matchingDay) return null;

    return mapWmoCodeToWeatherInfo(
      matchingDay.weatherCode,
      matchingDay.maximumTemperatureCelsius,
      matchingDay.minimumTemperatureCelsius,
      matchingDay.maximumPrecipitationProbability
    );
  }, [forecast, activeDay]);

  return {
    forecast,
    activeDayWeather,
  };
}
