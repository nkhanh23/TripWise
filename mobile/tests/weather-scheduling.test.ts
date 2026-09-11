import type { Coordinate, DailyWeather, WeatherForecast } from '../src/integration/contracts';
import { IntegrationError } from '../src/integration/errors';
import { evaluatePlanConstraints } from '../src/integration/deterministicConstraintEngine';
import { optimizeItineraryRoutes } from '../src/integration/routeOptimization';
import { evaluateWeatherScheduling, createWeatherSchedulingEvaluator } from '../src/integration/weatherScheduling';
import { applyWeatherSchedulingPolicy, validateWeatherScheduleProposal, type WeatherSchedule, type ExplicitWeatherPreference } from '../src/integration/weatherSchedulingPolicy';
import { OpenMeteoWeatherRepository } from '../src/integration/remote/publicProviderRepositories';
import type { WeatherRepository } from '../src/integration/repositories';

const coordinate: Coordinate = { latitude: 13.7437, longitude: 100.4889 };
const context = { localToday: '2026-09-10' };
function itinerary(): WeatherSchedule {
  return { id: 'weather-plan', days: [
    { dayNumber: 1, date: '2026-09-10', items: [{ id: 'A', position: 1, flexibility: 'flexible', priority: 'must_do', resolution: 'VERIFIED', ...coordinate }] },
    { dayNumber: 2, date: '2026-09-11', items: [] },
  ] };
}
const preferences: ExplicitWeatherPreference[] = [{ itemId: 'A', source: 'user_explicit', sensitivity: 'avoid_precipitation', allowedDayNumbers: [2] }];
function daily(date: string, probability: number | null): DailyWeather {
  return { date, maximumPrecipitationProbability: probability, weatherCode: 61,
    maximumTemperatureCelsius: 31, minimumTemperatureCelsius: 23 };
}
function forecast(high: number | null = 80, low: number | null = 10): WeatherForecast {
  return { days: [daily('2026-09-10', high), daily('2026-09-11', low)] };
}
function apply(plan = itinerary(), weather: WeatherForecast | null = forecast(), prefs: unknown = preferences) {
  return applyWeatherSchedulingPolicy(plan, prefs, context, { coordinate, forecast: weather });
}
function repo(weather: WeatherForecast | null = forecast()) {
  return { getForecast: jest.fn().mockResolvedValue(weather) };
}

describe('P5-T003 pure weather scheduling', () => {
  it('empty itinerary has no sensitive items and remains valid', () => {
    expect(apply({ days: [] }, null, [])).toMatchObject({ status: 'no_weather_sensitive_items', reason: 'empty_itinerary', schedule: { days: [] } });
  });
  it('no explicit sensitivity never moves items', () => {
    expect(apply(itinerary(), forecast(), [])).toMatchObject({ status: 'no_weather_sensitive_items', schedule: itinerary() });
  });
  it('explicit flexible item moves to permitted lower-precipitation date and MUST_DO is retained', () => {
    const result = apply();
    expect(result.status).toBe('applied');
    expect(result.schedule?.days[0].items).toEqual([]);
    expect(result.schedule?.days[1].items[0]).toMatchObject({ id: 'A', priority: 'must_do', position: 1 });
    expect(result.validation.isValid).toBe(true);
    expect(result.decisions).toEqual([{ itemId: 'A', fromDayNumber: 1, toDayNumber: 2, fromDate: '2026-09-10', toDate: '2026-09-11', originalPrecipitationPercent: 80, proposedPrecipitationPercent: 10 }]);
  });
  it('FIXED sensitive item and its time/day/position never move', () => {
    const plan = itinerary(); Object.assign(plan.days[0].items[0], { flexibility: 'fixed', startTime: '09:00', endTime: '10:00' });
    expect(apply(plan)).toMatchObject({ status: 'protected_constraint_conflict', reason: 'fixed_item', schedule: plan });
  });
  it('moving flexible item cannot shift a FIXED anchor position', () => {
    const plan = itinerary(); plan.days[0].items.push({ id: 'fixed', position: 2, flexibility: 'fixed', priority: 'must_do' });
    const result = apply(plan);
    expect(result).toMatchObject({ status: 'protected_constraint_conflict', schedule: plan });
    expect(result.rejectedValidation?.conflicts.some(c => c.code === 'FIXED_POSITION_CHANGED')).toBe(true);
  });
  it.each(['fixed_move', 'must_do_drop', 'must_do_downgrade'])('T001 rejects attempted %s', (change) => {
    const base = itinerary();
    if (change === 'fixed_move') base.days[0].items[0].flexibility = 'fixed';
    const candidate = structuredClone(base);
    if (change === 'must_do_downgrade') candidate.days[0].items[0].priority = 'optional';
    else { const [item] = candidate.days[0].items.splice(0); if (change === 'fixed_move') candidate.days[1].items.push(item); }
    expect(validateWeatherScheduleProposal(base, candidate)).toMatchObject({ status: 'protected_constraint_conflict', schedule: base });
  });
  it('calendar dates match exactly, even if provider array is reversed', () => {
    expect(apply(itinerary(), { days: forecast().days.reverse() })).toEqual(apply());
  });
  it('wrong calendar date is never borrowed from another day', () => {
    const weather = forecast(); weather.days[1].date = '2026-09-12';
    expect(apply(itinerary(), weather)).toMatchObject({ status: 'incomplete_forecast_facts', reason: 'missing_forecast_date', schedule: itinerary() });
  });
  it.each([0, 1])('null precipitation on relevant day %i is incomplete, never sunny', (index) => {
    const weather = forecast(); weather.days[index].maximumPrecipitationProbability = null;
    expect(apply(itinerary(), weather)).toMatchObject({ status: 'incomplete_forecast_facts', reason: 'missing_precipitation', decisions: [] });
  });
  it('null weather code/temperature do not replace or invalidate known precipitation facts', () => {
    const weather = forecast(); weather.days.forEach(day => { day.weatherCode = null; day.maximumTemperatureCelsius = null; day.minimumTemperatureCelsius = null; });
    expect(apply(itinerary(), weather)).toEqual(apply());
  });
  it('WMO codes and UI descriptions do not drive decisions', () => {
    const weather = forecast(); weather.days.forEach(day => Object.assign(day, { weatherCode: 0, conditionDescription: 'Sunny', maximumTemperatureCelsius: 99 }));
    expect(apply(itinerary(), weather)).toEqual(apply());
  });
  it('missing forecast is explicitly unavailable and retains baseline', () => {
    expect(apply(itinerary(), null)).toMatchObject({ status: 'forecast_unavailable', schedule: itinerary(), decisions: [] });
  });
  it.each([[59.99, 10, 'no_change'], [60, 10, 'applied'], [80, 29.99, 'applied'], [80, 30, 'no_change'], [0, 0, 'no_change']])('threshold %s -> %s gives %s', (high, low, status) => {
    expect(apply(itinerary(), forecast(high as number, low as number)).status).toBe(status);
  });
  it.each(['Beach outdoor hike', 'Ticketmaster Outdoor Festival'])('never infers sensitivity from title %s', (placeName) => {
    const plan = itinerary(); plan.days[0].items[0].placeName = placeName;
    expect(apply(plan, forecast(), []).status).toBe('no_weather_sensitive_items');
  });
  it.each(['UNRESOLVED', undefined])('missing VERIFIED resolution %s falls back', (resolution) => {
    const plan = itinerary(); plan.days[0].items[0].resolution = resolution as 'UNRESOLVED' | undefined;
    expect(apply(plan)).toMatchObject({ status: 'location_unavailable', reason: 'missing_verified_coordinate', schedule: plan });
  });
  it.each([NaN, Infinity, 91, null])('invalid latitude %s falls back without coordinates substitution', latitude => {
    const plan = itinerary(); plan.days[0].items[0].latitude = latitude;
    expect(apply(plan).status).toBe('location_unavailable');
  });
  it('facts tied to a different coordinate cannot be applied', () => {
    expect(applyWeatherSchedulingPolicy(itinerary(), preferences, context, { coordinate: { ...coordinate, longitude: 100 }, forecast: forecast() }).status).toBe('location_unavailable');
  });
  it.each(['2026-09-26', '2026-09-09'])('past or >16-day date %s is out of horizon', date => {
    const plan = itinerary(); plan.days[1].date = date;
    expect(apply(plan)).toMatchObject({ status: 'forecast_out_of_horizon', schedule: plan });
  });
  it('day 16 remains in range', async () => {
    const plan = itinerary(); plan.days[1].date = '2026-09-25'; const repository = repo();
    await evaluateWeatherScheduling(plan, preferences, context, repository);
    expect(repository.getForecast.mock.calls[0][0].forecastDays).toBe(16);
  });
  it.each(['2026-02-30', '2026-09-10T00:00:00Z', '2026-09-10'])('invalid/duplicate date %s rejected without repair', date => {
    const plan = itinerary(); plan.days[1].date = date;
    expect(apply(plan).status).toBe('invalid_input');
  });
  it('missing itinerary date is incomplete', () => {
    const plan = itinerary(); delete plan.days[1].date;
    expect(apply(plan)).toMatchObject({ status: 'incomplete_forecast_facts', reason: 'missing_calendar_date' });
  });
  it('unknown current local calendar date is invalid rather than using device clock', () => {
    expect(applyWeatherSchedulingPolicy(itinerary(), preferences, { localToday: '' }, { coordinate, forecast: forecast() }).status).toBe('invalid_input');
  });
  it.each([-1, 101, NaN, undefined])('invalid normalized probability %s is incomplete', probability => {
    const weather = forecast(); weather.days[0].maximumPrecipitationProbability = probability as number;
    expect(apply(itinerary(), weather)).toMatchObject({ status: 'incomplete_forecast_facts', reason: 'invalid_forecast' });
  });
  it('duplicate provider dates never depend on provider array order', () => {
    const weather = forecast(); weather.days[1].date = weather.days[0].date;
    expect(apply(itinerary(), weather).reason).toBe('invalid_forecast');
  });
  it.each(['startTime', 'transport', 'accommodation'])('does not reschedule activity bound by %s', field => {
    const plan = itinerary(); Object.assign(plan.days[0].items[0], { [field]: field === 'startTime' ? '09:00' : {} });
    expect(apply(plan)).toMatchObject({ status: 'no_change', reason: 'timed_or_bound_activity', schedule: plan });
  });
  it('result is identical and input is never mutated', () => {
    const plan = itinerary(); const original = structuredClone(plan);
    expect(apply(plan)).toEqual(apply(plan)); expect(plan).toEqual(original);
  });
  it('permutations of canonical days/items/preferences produce identical proposal', () => {
    const plan = itinerary(); plan.days[0].items.push({ ...plan.days[0].items[0], id: 'B', position: 2 });
    const prefs = [...preferences, { ...preferences[0], itemId: 'B' }];
    const expected = apply(plan, forecast(), prefs);
    plan.days.reverse(); plan.days[1].items.reverse(); prefs.reverse();
    expect(apply(plan, forecast(), prefs)).toEqual(expected);
  });
  it('does not move to any day not explicitly permitted', () => {
    expect(apply(itinerary(), forecast(), [{ ...preferences[0], allowedDayNumbers: [] }]).status).toBe('no_change');
  });
  it.each(['source', 'unknown_item', 'duplicate', 'too_many'])('invalid explicit metadata %s fails closed', mode => {
    let prefs: unknown = preferences;
    if (mode === 'source') prefs = [{ ...preferences[0], source: 'gemini' }];
    if (mode === 'unknown_item') prefs = [{ ...preferences[0], itemId: 'missing' }];
    if (mode === 'duplicate') prefs = [...preferences, ...preferences];
    if (mode === 'too_many') prefs = new Array(21);
    expect(apply(itinerary(), forecast(), prefs).status).toBe('invalid_input');
  });
  it('T002 accepts the weather proposal without route reimplementation', async () => {
    const routeRepo = { getRoute: jest.fn(), getTable: jest.fn() };
    const result = await optimizeItineraryRoutes(apply().schedule, routeRepo);
    expect(result.validation?.isValid).toBe(true); expect(result.status).toBe('already_optimal');
    expect(routeRepo.getTable).not.toHaveBeenCalled();
  });
});

describe('P5-T003 bounded optional fetch and cancellation', () => {
  it.each(['network', 'timeout', 'rateLimited', 'providerUnavailable'] as const)('%s failure retains safe baseline', async code => {
    const repository = { getForecast: jest.fn().mockRejectedValue(new IntegrationError(code)) };
    const result = await evaluateWeatherScheduling(itinerary(), preferences, context, repository);
    expect(result).toMatchObject({ status: 'forecast_unavailable', reason: 'provider_failure', schedule: itinerary(), logicalForecastRequestCount: 1 });
    expect(repository.getForecast).toHaveBeenCalledTimes(1);
  });
  it('repository null means unavailable, never sunny', async () => {
    expect(await evaluateWeatherScheduling(itinerary(), preferences, context, repo(null))).toMatchObject({ status: 'forecast_unavailable', decisions: [], schedule: itinerary() });
  });
  it('different sensitive locations cause zero requests rather than N+1', async () => {
    const plan = itinerary(); plan.days[0].items.push({ ...plan.days[0].items[0], id: 'B', position: 2, longitude: 101 });
    const repository = repo();
    const result = await evaluateWeatherScheduling(plan, [...preferences, { ...preferences[0], itemId: 'B' }], context, repository);
    expect(result).toMatchObject({ status: 'location_unavailable', reason: 'multiple_locations', logicalForecastRequestCount: 0 });
    expect(repository.getForecast).not.toHaveBeenCalled();
  });
  it('20 same-location preferences share one bounded request', async () => {
    const plan = itinerary(); plan.days[0].items = Array.from({ length: 20 }, (_, i) => ({ ...plan.days[0].items[0], id: `id-${i}`, position: i + 1 }));
    const prefs = plan.days[0].items.map(item => ({ ...preferences[0], itemId: item.id }));
    const repository = repo(); const result = await evaluateWeatherScheduling(plan, prefs, context, repository);
    expect(result.status).toBe('applied'); expect(result.logicalForecastRequestCount).toBe(1);
    expect(repository.getForecast).toHaveBeenCalledTimes(1);
  });
  it('out-of-horizon makes zero provider calls', async () => {
    const plan = itinerary(); plan.days[1].date = '2026-10-01'; const repository = repo();
    expect((await evaluateWeatherScheduling(plan, preferences, context, repository)).status).toBe('forecast_out_of_horizon');
    expect(repository.getForecast).not.toHaveBeenCalled();
  });
  it('pre-cancelled evaluation makes zero calls', async () => {
    const controller = new AbortController(); controller.abort(); const repository = repo();
    expect(await evaluateWeatherScheduling(itinerary(), preferences, { ...context, signal: controller.signal }, repository)).toMatchObject({ status: 'cancelled', logicalForecastRequestCount: 0 });
    expect(repository.getForecast).not.toHaveBeenCalled();
  });
  it('in-flight cancellation ignores late repository success', async () => {
    let finish!: (value: WeatherForecast) => void;
    const repository: WeatherRepository = { getForecast: jest.fn(() => new Promise(resolve => { finish = resolve; })) };
    const controller = new AbortController();
    const pending = evaluateWeatherScheduling(itinerary(), preferences, { ...context, signal: controller.signal }, repository);
    controller.abort(); const result = await pending; finish(forecast());
    expect(result).toMatchObject({ status: 'cancelled', decisions: [], schedule: itinerary(), logicalForecastRequestCount: 1 });
  });
  it('superseded response cannot override the newer result', async () => {
    let finishOld!: (value: WeatherForecast) => void;
    const repository = { getForecast: jest.fn().mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve; })).mockResolvedValue(forecast()) };
    const evaluator = createWeatherSchedulingEvaluator(repository);
    const old = evaluator.evaluate(itinerary(), preferences, context);
    const newer = evaluator.evaluate(itinerary(), preferences, context);
    expect((await newer).status).toBe('applied'); finishOld(forecast());
    expect(await old).toMatchObject({ status: 'cancelled', decisions: [] });
  });
  it.each(['days', 'items'])('T001 rejects oversized %s without projection/getter access', async kind => {
    const touched = jest.fn(() => { throw new Error('Traversal after bounds'); });
    const values = new Array(kind === 'days' ? 61 : 51); Object.defineProperty(values, '0', { get: touched });
    const input = { days: kind === 'days' ? values : [{ dayNumber: 1, items: values }] };
    const repository = repo();
    expect(await evaluateWeatherScheduling(input, preferences, context, repository)).toMatchObject({ status: 'invalid_input', schedule: null, logicalForecastRequestCount: 0 });
    expect(touched).not.toHaveBeenCalled(); expect(repository.getForecast).not.toHaveBeenCalled();
  });
  it('zero persistence and caller snapshot remains intact across async evaluation', async () => {
    const plan = itinerary(); const before = structuredClone(plan); const repository = repo();
    const result = await evaluateWeatherScheduling(plan, preferences, context, repository);
    expect(plan).toEqual(before); expect(result.validation.isValid).toBe(true);
    expect(Object.keys(repository)).toEqual(['getForecast']);
    expect(evaluatePlanConstraints(result.schedule, plan).isValid).toBe(true);
  });
});

describe('CONTROLLED FAILURE/FALLBACK EVIDENCE through production Open-Meteo boundary', () => {
  it.each([429, 503])('scheduling HTTP %i uses one attempt and retains baseline', async status => {
    const transport = jest.fn().mockResolvedValue({ ok: false, status });
    const result = await evaluateWeatherScheduling(itinerary(), preferences, context, new OpenMeteoWeatherRepository(transport, 'scheduling'));
    expect(result.status).toBe('forecast_unavailable'); expect(result.schedule).toEqual(itinerary());
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it('scheduling network failure uses one attempt', async () => {
    const transport = jest.fn().mockRejectedValue(new TypeError('offline'));
    expect((await evaluateWeatherScheduling(itinerary(), preferences, context, new OpenMeteoWeatherRepository(transport, 'scheduling'))).status).toBe('forecast_unavailable');
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it('scheduling timeout uses one attempt and does not block the trip', async () => {
    jest.useFakeTimers();
    try {
      const transport = jest.fn(() => new Promise<Response>(() => {}));
      const pending = evaluateWeatherScheduling(itinerary(), preferences, context, new OpenMeteoWeatherRepository(transport, 'scheduling'));
      await jest.advanceTimersByTimeAsync(8001);
      expect(await pending).toMatchObject({ status: 'forecast_unavailable', schedule: itinerary() });
      expect(transport).toHaveBeenCalledTimes(1);
    } finally { jest.useRealTimers(); }
  });
  it('malformed provider response falls back rather than failing the trip', async () => {
    const transport = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ daily: { time: ['wrong'] } }) });
    expect((await evaluateWeatherScheduling(itinerary(), preferences, context, new OpenMeteoWeatherRepository(transport, 'scheduling'))).status).toBe('forecast_unavailable');
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it('default Trip Detail retry behavior remains two attempts', async () => {
    const transport = jest.fn().mockResolvedValue({ ok: false, status: 503 });
    expect(await new OpenMeteoWeatherRepository(transport).getForecast({ ...coordinate, forecastDays: 2 })).toBeNull();
    expect(transport).toHaveBeenCalledTimes(2);
  });
});

describe('T003 reservation-safety corrective', () => {
  it('flexible place with reservation retains exact day/position, MUST_DO and metadata', () => {
    const plan = itinerary();
    Object.assign(plan.days[0].items[0], { itemKind: 'place', contact: { reservationCode: 'TEST-RESERVATION-123' } });
    const before = structuredClone(plan);
    const result = apply(plan);
    expect(result).toMatchObject({ status: 'no_change', reason: 'timed_or_bound_activity', decisions: [], schedule: before });
    expect(result.schedule?.days[0].items[0]).toMatchObject({ id: 'A', position: 1, priority: 'must_do', contact: { reservationCode: 'TEST-RESERVATION-123' } });
    expect(evaluatePlanConstraints(result.schedule, plan).isValid).toBe(true);
    expect(plan).toEqual(before);
  });
  it.each([undefined, null])('absent/null reservationCode %s leaves the same place eligible', reservationCode => {
    const plan = itinerary(); Object.assign(plan.days[0].items[0], { itemKind: 'place', contact: { reservationCode } });
    expect(apply(plan).status).toBe('applied');
  });
  it.each(['', '   '])('empty reservationCode %j follows canonical rejection, never silently removed', reservationCode => {
    const plan = itinerary(); plan.days[0].items[0].contact = { reservationCode };
    expect(apply(plan)).toMatchObject({ status: 'invalid_input', reason: 'invalid_itinerary', schedule: plan, decisions: [] });
  });
  it('booking URL and booking source link alone do not imply a reservation', () => {
    const plan = itinerary();
    Object.assign(plan.days[0].items[0], { contact: { bookingUrl: 'https://example.com/booking' }, sourceLinks: [{ type: 'booking', url: 'https://example.com/booking' }] });
    const result = apply(plan);
    expect(result.status).toBe('applied');
    expect(result.schedule?.days[1].items[0]).toMatchObject({ contact: { bookingUrl: 'https://example.com/booking' }, sourceLinks: [{ type: 'booking', url: 'https://example.com/booking' }] });
  });
  it.each(['reservation', 'transport', 'accommodation'])('itemKind=%s remains bound', itemKind => {
    const plan = itinerary(); plan.days[0].items[0].itemKind = itemKind;
    expect(apply(plan)).toMatchObject({ status: 'no_change', reason: 'timed_or_bound_activity', schedule: plan });
  });
  it('another movable sensitive item still fetches weather when reservation metadata exists', async () => {
    const plan = itinerary();
    plan.days[0].items[0].contact = { reservationCode: 'TEST-BOUND' };
    plan.days[0].items.push({ ...plan.days[0].items[0], id: 'B', position: 2, contact: undefined });
    const repository = repo();
    const result = await evaluateWeatherScheduling(plan, [{ ...preferences[0], itemId: 'B' }], context, repository);
    expect(result.status).toBe('applied');
    expect(result.schedule?.days[0].items).toEqual([plan.days[0].items[0]]);
    expect(result.schedule?.days[1].items[0].id).toBe('B');
    expect(repository.getForecast).toHaveBeenCalledTimes(1);
    expect(result.logicalForecastRequestCount).toBe(1);
    expect(evaluatePlanConstraints(result.schedule, plan).isValid).toBe(true);
  });
  it('sensitive reserved and movable items preserve existing atomic no-change behavior after fetch', async () => {
    const plan = itinerary(); plan.days[0].items[0].contact = { reservationCode: 'TEST-BOUND' };
    plan.days[0].items.push({ ...plan.days[0].items[0], id: 'B', position: 2, contact: undefined });
    const repository = repo();
    const result = await evaluateWeatherScheduling(plan, [...preferences, { ...preferences[0], itemId: 'B' }], context, repository);
    expect(result).toMatchObject({ status: 'no_change', reason: 'timed_or_bound_activity', schedule: plan, logicalForecastRequestCount: 1 });
    expect(repository.getForecast).toHaveBeenCalledTimes(1);
  });
  it('moving another item cannot shift a non-sensitive reservation position', () => {
    const plan = itinerary(); plan.days[0].items.push({ ...plan.days[0].items[0], id: 'B', position: 2, contact: { reservationCode: 'TEST-BOUND' } });
    expect(apply(plan)).toMatchObject({ status: 'no_change', reason: 'timed_or_bound_activity', schedule: plan });
  });
  it('reservation metadata is snapshotted before await and no persistence occurs', async () => {
    const plan = itinerary(); plan.days[0].items[0].contact = { reservationCode: 'TEST-BOUND' };
    let finish!: (value: WeatherForecast) => void;
    const repository = { getForecast: jest.fn(() => new Promise<WeatherForecast>(resolve => { finish = resolve; })) };
    const pending = evaluateWeatherScheduling(plan, preferences, context, repository);
    plan.days[0].items[0].contact.reservationCode = null;
    finish(forecast());
    const result = await pending;
    expect(result.status).toBe('no_change');
    expect(result.schedule?.days[0].items[0].contact?.reservationCode).toBe('TEST-BOUND');
    expect(Object.keys(repository)).toEqual(['getForecast']);
  });
});
