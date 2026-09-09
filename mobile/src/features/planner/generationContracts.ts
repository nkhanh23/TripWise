import type { GenerateTripRequest, GeneratedTrip, TripGraphPayload } from '../../integration/contracts';
import { IntegrationError } from '../../integration/errors';
import { assertInclusiveDuration } from '../../integration/mappers';
import { validateGenerateTripRequest } from '../../integration/validation';
import { mockTravelStyles } from './data/mockWizardData';
import type { CreateTripWizardState } from './types';
import { isValidBudgetCurrency, parseAccountingBudgetInput, validateAccountingBudget } from './budgetValidation';

export type PlannerGeneratedItem = {
  position: number;
  placeName: string;
  placeQuery?: string;
  startTime?: string;
  endTime?: string;
  note?: string;
  estimatedCost?: number;
  resolution: 'UNRESOLVED';
};

export type PlannerGeneratedPreview = {
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  summary?: string;
  days: { dayNumber: number; date: string; summary?: string; items: PlannerGeneratedItem[] }[];
};

export function mapWizardStateToGenerateTripRequest(state: CreateTripWizardState): GenerateTripRequest {
  if (!validateAccountingBudget(state.budgetAmount, state.budgetCurrency).valid) {
    throw new IntegrationError('invalidRequest');
  }
  const destination = state.destination?.name ?? state.customDestinationName.trim();
  assertInclusiveDuration(state.startDate, state.endDate, state.durationDays);
  const preferences = state.selectedStyles.map((styleId) => {
    const style = mockTravelStyles.find((candidate) => candidate.id === styleId);
    if (!style) throw new IntegrationError('invalidRequest');
    return style.label;
  });
  return validateGenerateTripRequest({
    destination,
    startDate: state.startDate,
    endDate: state.endDate,
    ...(preferences.length === 0 ? {} : { preferences }),
    notes: `Travel pace: ${state.pace}; budget tier: ${state.budget}; group type: ${state.groupType}.`,
  });
}

export function mapGeneratedTripToPlannerPreview(generated: GeneratedTrip): PlannerGeneratedPreview {
  return {
    title: generated.title, destination: generated.destination, startDate: generated.startDate, endDate: generated.endDate,
    ...(generated.summary === undefined ? {} : { summary: generated.summary }),
    days: generated.days.map((day) => ({
      dayNumber: day.dayNumber, date: day.date,
      ...(day.summary === undefined ? {} : { summary: day.summary }),
      items: day.items.map((item) => ({
        position: item.position, placeName: item.placeName,
        ...(item.placeQuery === undefined ? {} : { placeQuery: item.placeQuery }),
        ...(item.startTime === undefined ? {} : { startTime: item.startTime }),
        ...(item.endTime === undefined ? {} : { endTime: item.endTime }),
        ...(item.note === undefined ? {} : { note: item.note }),
        ...(item.estimatedCost === undefined ? {} : { estimatedCost: item.estimatedCost }),
        resolution: 'UNRESOLVED' as const,
      })),
    })),
  };
}

export type PlannerBudgetConfig = {
  estimatedBudget?: number | null;
  currency?: string | null;
};

export function mapPlannerPreviewToPersistenceGraph(
  preview: PlannerGeneratedPreview,
  userEnteredTitle?: string | null,
  budgetConfig?: PlannerBudgetConfig | null,
): TripGraphPayload {
  if (budgetConfig?.estimatedBudget !== undefined && budgetConfig.estimatedBudget !== null) {
    if (typeof budgetConfig.estimatedBudget !== 'number'
      || !parseAccountingBudgetInput(String(budgetConfig.estimatedBudget)).valid
      || !isValidBudgetCurrency(budgetConfig.currency)) {
      throw new IntegrationError('invalidRequest');
    }
  }
  const title = userEnteredTitle?.trim() || preview.title.trim();
  if (!title) throw new IntegrationError('invalidRequest');
  return {
    title,
    destination: preview.destination,
    startDate: preview.startDate,
    endDate: preview.endDate,
    ...(budgetConfig?.estimatedBudget !== undefined ? { estimatedBudget: budgetConfig.estimatedBudget } : {}),
    ...(budgetConfig?.currency !== undefined ? { currency: budgetConfig.currency } : {}),
    days: preview.days.map((day) => ({
      dayNumber: day.dayNumber,
      date: day.date,
      ...(day.summary === undefined ? {} : { summary: day.summary }),
      items: day.items.map((item) => ({
        position: item.position,
        placeName: item.placeName,
        ...(item.placeQuery === undefined ? {} : { placeQuery: item.placeQuery }),
        ...(item.startTime === undefined ? {} : { startTime: item.startTime }),
        ...(item.endTime === undefined ? {} : { endTime: item.endTime }),
        ...(item.note === undefined ? {} : { note: item.note }),
      })),
    })),
  };
}
