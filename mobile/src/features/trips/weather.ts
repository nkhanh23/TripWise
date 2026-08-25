import type MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useEffect, useMemo, useRef, useState } from "react";

import type {
  DailyWeather,
  WeatherForecast,
} from "../../integration/contracts";
import type { WeatherRepository } from "../../integration/repositories";
import type { TripDayItinerary, TripDetailData } from "./types";

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
  precipitationProb: number | null,
): WeatherBadgeData | null {
  if (maxTemp === null && minTemp === null) return null;

  let iconName: keyof typeof MaterialIcons.glyphMap = "wb-sunny";
  let conditionDescription = "Sunny";

  if (weatherCode === 0) {
    iconName = "wb-sunny";
    conditionDescription = "Clear sky";
  } else if (weatherCode === 1 || weatherCode === 2 || weatherCode === 3) {
    iconName = "cloud";
    conditionDescription = "Partly cloudy";
  } else if (weatherCode === 45 || weatherCode === 48) {
    iconName = "foggy" as keyof typeof MaterialIcons.glyphMap;
    conditionDescription = "Foggy";
  } else if (
    (weatherCode !== null && weatherCode >= 51 && weatherCode <= 67) ||
    (weatherCode !== null && weatherCode >= 80 && weatherCode <= 82)
  ) {
    iconName = "grain";
    conditionDescription = "Rain";
  } else if (
    (weatherCode !== null && weatherCode >= 71 && weatherCode <= 77) ||
    (weatherCode !== null && weatherCode >= 85 && weatherCode <= 86)
  ) {
    iconName = "ac-unit";
    conditionDescription = "Snow";
  } else if (weatherCode !== null && weatherCode >= 95 && weatherCode <= 99) {
    iconName = "flash-on";
    conditionDescription = "Thunderstorm";
  }

  const max = maxTemp !== null ? `${Math.round(maxTemp)}°` : "";
  const min = minTemp !== null ? `${Math.round(minTemp)}°` : "";
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

function extractVerifiedCoordinates(
  tripData: TripDetailData | null,
): { latitude: number; longitude: number } | null {
  if (!tripData?.days) return null;
  for (const day of tripData.days) {
    for (const item of day.items) {
      if (
        item.resolution === "VERIFIED" &&
        typeof item.latitude === "number" &&
        typeof item.longitude === "number" &&
        Number.isFinite(item.latitude) &&
        Number.isFinite(item.longitude)
      ) {
        return { latitude: item.latitude, longitude: item.longitude };
      }
    }
  }
  return null;
}

const maxProviderForecastDays = 16;
const defaultNow = (): Date => new Date();

function toUtcDayNumber(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  )
    return null;
  return Math.floor(date.getTime() / 86_400_000);
}

function getLocalIsoDate(now: Date): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getRequiredForecastDays(
  tripData: TripDetailData | null,
  today: string,
): number | null {
  const todayDay = toUtcDayNumber(today);
  if (todayDay === null || !tripData?.days?.length) return null;

  const itineraryDays = tripData.days
    .map((day) => toUtcDayNumber(day.date))
    .filter((day): day is number => day !== null);
  if (!itineraryDays.length) return null;

  const latestItineraryDay = Math.max(...itineraryDays);
  if (latestItineraryDay < todayDay) return null;

  const requiredDays = latestItineraryDay - todayDay + 1;
  return requiredDays <= maxProviderForecastDays ? requiredDays : null;
}

export function getActiveDayWeather(
  forecast: WeatherForecast | null,
  activeDay: TripDayItinerary | null,
): WeatherBadgeData | null {
  if (!forecast?.days?.length || !activeDay?.date) return null;
  const matchingDay: DailyWeather | undefined = forecast.days.find(
    (day) => day.date === activeDay.date,
  );
  if (!matchingDay) return null;

  return mapWmoCodeToWeatherInfo(
    matchingDay.weatherCode,
    matchingDay.maximumTemperatureCelsius,
    matchingDay.minimumTemperatureCelsius,
    matchingDay.maximumPrecipitationProbability,
  );
}

export function useTripWeather(
  tripData: TripDetailData | null,
  activeDay: TripDayItinerary | null,
  weatherRepository?: WeatherRepository,
  now: () => Date = defaultNow,
) {
  const [fetchedForecast, setFetchedForecast] =
    useState<WeatherForecast | null>(null);
  const activeController = useRef<AbortController | null>(null);

  const coordinates = useMemo(
    () => extractVerifiedCoordinates(tripData),
    [tripData],
  );
  const forecastDays = useMemo(
    () => getRequiredForecastDays(tripData, getLocalIsoDate(now())),
    [tripData, now],
  );

  const forecast = coordinates ? fetchedForecast : null;

  useEffect(() => {
    const requiredForecastDays = forecastDays;
    if (!weatherRepository || !coordinates || requiredForecastDays === null) {
      return;
    }
    const boundedForecastDays: number = requiredForecastDays;

    const controller = new AbortController();
    activeController.current = controller;

    async function loadWeather() {
      try {
        const result = await weatherRepository!.getForecast(
          {
            latitude: coordinates!.latitude,
            longitude: coordinates!.longitude,
            forecastDays: boundedForecastDays,
          },
          controller.signal,
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
    return getActiveDayWeather(forecast, activeDay);
  }, [forecast, activeDay]);

  return {
    forecast,
    activeDayWeather,
  };
}
