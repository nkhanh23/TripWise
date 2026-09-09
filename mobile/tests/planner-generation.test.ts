jest.mock('../src/lib/supabase/client', () => ({ supabase: {} }));

import { IntegrationError } from '../src/integration/errors';
import {
  mapGeneratedTripToPlannerPreview,
  mapWizardStateToGenerateTripRequest,
} from '../src/features/planner/generation';
import { initialWizardState } from '../src/features/planner/data/mockWizardData';

describe('planner generation mapping', () => {
  it('maps every supported wizard intent without inventing numeric budget or traveler values', () => {
    const request = mapWizardStateToGenerateTripRequest({
      ...initialWizardState,
      destination: { id: '1', name: 'Bangkok', formattedAddress: 'Thailand', imageUrl: '' },
      startDate: '2026-10-15',
      endDate: '2026-10-20',
      durationDays: 6,
      selectedStyles: ['culture', 'food'],
      pace: 'fast',
      budget: 'luxury',
      groupType: 'friends',
      tripTitle: 'User-owned title',
    });
    expect(request).toEqual({
      destination: 'Bangkok', startDate: '2026-10-15', endDate: '2026-10-20',
      preferences: ['Culture & History', 'Food & Dining'],
      notes: 'Travel pace: fast; budget tier: luxury; group type: friends.',
    });
    expect(request).not.toHaveProperty('budget');
    expect(request).not.toHaveProperty('travelers');
    expect(request).not.toHaveProperty('tripTitle');
  });

  it('rejects inconsistent inclusive duration and unsupported style values before transport', () => {
    expect(() => mapWizardStateToGenerateTripRequest({ ...initialWizardState, destination: { id: '1', name: 'Bangkok', formattedAddress: 'Thailand', imageUrl: '' }, startDate: '2026-10-15', endDate: '2026-10-20', durationDays: 5 })).toThrow();
    expect(() => mapWizardStateToGenerateTripRequest({ ...initialWizardState, destination: { id: '1', name: 'Bangkok', formattedAddress: 'Thailand', imageUrl: '' }, startDate: '2026-10-15', endDate: '2026-10-20', durationDays: 6, selectedStyles: ['unsupported'] }))
      .toThrow(IntegrationError);
  });

  it('maps every generated suggestion as unresolved and never creates provider identifiers or coordinates', () => {
    const preview = mapGeneratedTripToPlannerPreview({
      title: 'Bangkok day', destination: 'Bangkok', startDate: '2026-10-15', endDate: '2026-10-15',
      days: [{ dayNumber: 1, date: '2026-10-15', items: [{ position: 1, placeName: 'Wat Arun', placeQuery: 'Wat Arun Bangkok' }] }],
    });
    expect(preview.days[0].items[0]).toEqual({
      position: 1, placeName: 'Wat Arun', placeQuery: 'Wat Arun Bangkok', resolution: 'UNRESOLVED',
    });
    expect(preview.days[0].items[0]).not.toHaveProperty('googlePlaceId');
    expect(preview.days[0].items[0]).not.toHaveProperty('latitude');
  });

  it('maps persistence graph with exact configured budget and currency without fabricating numbers', () => {
    const preview = mapGeneratedTripToPlannerPreview({
      title: 'Tokyo adventure',
      destination: 'Tokyo',
      startDate: '2026-10-15',
      endDate: '2026-10-15',
      days: [
        {
          dayNumber: 1,
          date: '2026-10-15',
          items: [{ position: 1, placeName: 'Shibuya Sky' }],
        },
      ],
    });

    // Case 1: Configured budget and currency
    const graphWithBudget = require('../src/features/planner/generationContracts').mapPlannerPreviewToPersistenceGraph(
      preview,
      'My Custom Tokyo Trip',
      { estimatedBudget: 1000, currency: 'USD' },
    );
    expect(graphWithBudget.title).toBe('My Custom Tokyo Trip');
    expect(graphWithBudget.estimatedBudget).toBe(1000);
    expect(graphWithBudget.currency).toBe('USD');

    // Case 2: Explicit null budget and currency (unconfigured)
    const graphUnconfigured = require('../src/features/planner/generationContracts').mapPlannerPreviewToPersistenceGraph(
      preview,
      null,
      { estimatedBudget: null, currency: null },
    );
    expect(graphUnconfigured.title).toBe('Tokyo adventure');
    expect(graphUnconfigured.estimatedBudget).toBeNull();
    expect(graphUnconfigured.currency).toBeNull();

    // Case 3: Omitted budgetConfig
    const graphOmitted = require('../src/features/planner/generationContracts').mapPlannerPreviewToPersistenceGraph(
      preview,
    );
    expect(graphOmitted.estimatedBudget).toBeUndefined();
    expect(graphOmitted.currency).toBeUndefined();
  });
});
