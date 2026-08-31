import { clamp, rangeProgress } from './timeline';

export const GENERATION_COMPOSITION_FRAMES = {
  INITIAL_END: 23,
  ROUTE_DRAW_START: 24,
  ACTIVITY_1_VISIBLE: 39,
  ACTIVITY_2_VISIBLE: 68,
  ACTIVITY_3_VISIBLE: 95,
  DAY_COMPOSITION_START: 110,
  GENERATION_HOLD: 151,
} as const;

export const GENERATION_SHEET_TRANSITION_START = 110;
export const GENERATION_SHEET_TRANSITION_END = 120;

export type GenerationCompositionStage = 'initial' | 'route-and-activities' | 'day-composition' | 'generation-hold';
export type GenerationSheetSlot = 'generation-understanding' | 'itinerary-building';

export function getGenerationCompositionStage(frame: number): GenerationCompositionStage {
  const bounded = clamp(frame, 0, GENERATION_COMPOSITION_FRAMES.GENERATION_HOLD);
  if (bounded <= GENERATION_COMPOSITION_FRAMES.INITIAL_END) return 'initial';
  if (bounded < GENERATION_COMPOSITION_FRAMES.DAY_COMPOSITION_START) return 'route-and-activities';
  if (bounded < GENERATION_COMPOSITION_FRAMES.GENERATION_HOLD) return 'day-composition';
  return 'generation-hold';
}

/** F110–F120 crossfades semantic presentation slots, then itinerary-building holds through F151. */
export function getGenerationSheetTransitionProgress(frame: number): number {
  return rangeProgress(frame, GENERATION_SHEET_TRANSITION_START, GENERATION_SHEET_TRANSITION_END);
}

export function getGenerationUnderstandingOpacity(frame: number): number {
  return 1 - getGenerationSheetTransitionProgress(frame);
}

export function getItineraryBuildingOpacity(frame: number): number {
  return getGenerationSheetTransitionProgress(frame);
}

export function getGenerationSheetSlot(frame: number): GenerationSheetSlot {
  return getGenerationSheetTransitionProgress(frame) < 0.5 ? 'generation-understanding' : 'itinerary-building';
}

export function getGenerationSheetTranslateY(frame: number): number {
  return -12 * getGenerationSheetTransitionProgress(frame);
}