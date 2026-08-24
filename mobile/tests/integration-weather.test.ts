import {
  getActiveDayWeather,
  getRequiredForecastDays,
  mapWmoCodeToWeatherInfo,
} from '../src/features/trips/weather';
import { OpenMeteoWeatherRepository } from '../src/integration/remote/publicProviderRepositories';
import {
  ContractValidationError,
  parseOpenMeteoForecast,
  validateWeatherRequest,
} from '../src/integration/validation';

describe('Open-Meteo Weather Integration & Formatting', () => {
  const tripWithDates = (dates: string[]) => ({
    id: 'weather-trip',
    title: 'Weather trip',
    destination: 'Bangkok',
    startDate: dates[0] ?? '2026-08-23',
    endDate: dates[dates.length - 1] ?? '2026-08-23',
    dateLabel: 'Weather trip',
    durationDays: dates.length,
    heroImageUrl: '',
    budgetSpent: '',
    budgetTotal: '',
    budgetPercent: 0,
    travelers: [],
    savedPlacesCount: 0,
    days: dates.map((date, index) => ({
      id: `day-${index + 1}`,
      dayNumber: index + 1,
      date,
      dateLabel: `Day ${index + 1}`,
      items: [],
    })),
  });

  describe('itinerary forecast window', () => {
    it('requests one day for a same-day trip', () => {
      expect(getRequiredForecastDays(tripWithDates(['2026-08-23']), '2026-08-23')).toBe(1);
    });

    it('covers a future trip date within the provider horizon', () => {
      expect(getRequiredForecastDays(tripWithDates(['2026-08-25']), '2026-08-23')).toBe(3);
    });

    it('covers every day of a multi-day future trip within the provider horizon', () => {
      expect(
        getRequiredForecastDays(
          tripWithDates(['2026-08-25', '2026-08-26', '2026-08-27']),
          '2026-08-23',
        ),
      ).toBe(5);
    });

    it('leaves weather unavailable when the itinerary exceeds the provider horizon', () => {
      expect(getRequiredForecastDays(tripWithDates(['2026-09-08']), '2026-08-23')).toBeNull();
    });

    it('never maps weather from a different date onto the active itinerary day', () => {
      const result = getActiveDayWeather(
        {
          days: [{
            date: '2026-08-23',
            weatherCode: 0,
            maximumTemperatureCelsius: 32,
            minimumTemperatureCelsius: 25,
            maximumPrecipitationProbability: 0,
          }],
        },
        { id: 'day-25', dayNumber: 1, date: '2026-08-25', dateLabel: 'Day 1', items: [] },
      );
      expect(result).toBeNull();
    });
  });

  describe('validateWeatherRequest', () => {
    it('validates correct coordinate and forecast days', () => {
      const request = validateWeatherRequest({
        latitude: 13.7563,
        longitude: 100.5018,
        forecastDays: 7,
      });
      expect(request.latitude).toBe(13.7563);
      expect(request.longitude).toBe(100.5018);
      expect(request.forecastDays).toBe(7);
    });

    it('rejects invalid coordinates and forecast days out of bounds', () => {
      expect(() =>
        validateWeatherRequest({ latitude: 100, longitude: 100, forecastDays: 7 })
      ).toThrow(ContractValidationError);
      expect(() =>
        validateWeatherRequest({ latitude: 13.7, longitude: 100.5, forecastDays: 20 })
      ).toThrow(ContractValidationError);
    });
  });

  describe('parseOpenMeteoForecast', () => {
    it('parses valid forecast response', () => {
      const raw = {
        daily: {
          time: ['2026-10-12', '2026-10-13'],
          weather_code: [0, 61],
          temperature_2m_max: [32.5, 30.0],
          temperature_2m_min: [25.0, 24.5],
          precipitation_probability_max: [10, 80],
        },
      };

      const parsed = parseOpenMeteoForecast(raw);
      expect(parsed.daily.time).toEqual(['2026-10-12', '2026-10-13']);
      expect(parsed.daily.weather_code).toEqual([0, 61]);
    });
  });

  describe('mapWmoCodeToWeatherInfo', () => {
    it('maps clear sky code 0 correctly', () => {
      const info = mapWmoCodeToWeatherInfo(0, 32.4, 25.1, 10);
      expect(info).toEqual({
        iconName: 'wb-sunny',
        temperatureLabel: '32° / 25°',
        precipitationLabel: '10%',
        conditionDescription: 'Clear sky',
      });
    });

    it('maps rain code 61 correctly', () => {
      const info = mapWmoCodeToWeatherInfo(61, 30.2, 24.0, 75);
      expect(info).toEqual({
        iconName: 'grain',
        temperatureLabel: '30° / 24°',
        precipitationLabel: '75%',
        conditionDescription: 'Rain',
      });
    });

    it('returns null when temperature data is null', () => {
      const info = mapWmoCodeToWeatherInfo(0, null, null, null);
      expect(info).toBeNull();
    });
  });

  describe('OpenMeteoWeatherRepository', () => {
    it('returns null gracefully on network failure without throwing', async () => {
      const mockFetch = jest.fn().mockRejectedValue(new TypeError('Network failure'));
      const repo = new OpenMeteoWeatherRepository(mockFetch);

      const result = await repo.getForecast({
        latitude: 13.7563,
        longitude: 100.5018,
        forecastDays: 5,
      });

      expect(result).toBeNull();
    });

    it('returns forecast model on valid response', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          daily: {
            time: ['2026-10-12'],
            weather_code: [1],
            temperature_2m_max: [33],
            temperature_2m_min: [26],
            precipitation_probability_max: [0],
          },
        }),
      });

      const repo = new OpenMeteoWeatherRepository(mockFetch);
      const result = await repo.getForecast({
        latitude: 13.7563,
        longitude: 100.5018,
        forecastDays: 1,
      });

      expect(result?.days).toHaveLength(1);
      expect(result?.days[0].maximumTemperatureCelsius).toBe(33);
    });
  });
});
