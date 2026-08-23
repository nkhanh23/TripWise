import {
  asFixtureId, assertInclusiveDuration, mapGeneratedTripToGraph, resolveTripTitle,
} from '../src/integration/mappers';
import { asItineraryItemId } from '../src/integration/validation';

const generated = {
  title: 'Generated fallback', destination: 'Đà Nẵng', startDate: '2026-09-01', endDate: '2026-09-02',
  days: [
    { dayNumber: 1, date: '2026-09-01', items: [{ position: 1, placeName: 'Biển Mỹ Khê' }] },
    { dayNumber: 2, date: '2026-09-02', items: [{ position: 1, placeName: 'Ngũ Hành Sơn' }] },
  ],
};

describe('integration mappers', () => {
  it('prefers a user title and preserves generated fallback', () => {
    expect(resolveTripTitle('  Kỳ nghỉ ', generated.title)).toBe('Kỳ nghỉ');
    expect(resolveTripTitle(null, generated.title)).toBe('Generated fallback');
  });

  it('detects inclusive duration mismatch instead of silently repairing it', () => {
    expect(() => assertInclusiveDuration('2026-09-01', '2026-09-02', 2)).not.toThrow();
    expect(() => assertInclusiveDuration('2026-09-01', '2026-09-02', 1)).toThrow();
  });

  it('does not turn budget tiers or provider-looking data into trusted persistence fields', () => {
    const graph = mapGeneratedTripToGraph(generated, { userEnteredTitle: 'Đà Nẵng' });
    expect(graph).not.toHaveProperty('estimatedBudget');
    expect(graph.days[0].items[0]).toEqual({ position: 1, placeName: 'Biển Mỹ Khê' });
  });

  it('keeps fixture IDs distinct from UUID-backed itinerary item IDs at the mapping boundary', () => {
    expect(asFixtureId('fixture-1')).toBe('fixture-1');
    expect(asItineraryItemId('33333333-3333-4333-8333-333333333333')).not.toBe('fixture-1');
  });
});
