import { clamp, rangeProgress } from './timeline';

const DAY_INDICATOR_REVEALS = [
  { start: 110, end: 124 },
  { start: 124, end: 138 },
  { start: 138, end: 151 },
] as const;

export const DAY_INDICATOR_TRANSITION_START = 110;
export const DAY_INDICATOR_TRANSITION_END = 151;
export const MAX_ABSTRACT_DAY_INDICATORS = DAY_INDICATOR_REVEALS.length;
export const ABSTRACT_CANVAS_SCROLL_DISTANCE = 40;
export const ABSTRACT_DAY_INDICATOR_OFFSET_Y = 12;

export function getBoundedDayIndicatorCount(durationDays: number): number {
  if (!Number.isFinite(durationDays) || durationDays < 1) return 0;
  return clamp(Math.floor(durationDays), 1, MAX_ABSTRACT_DAY_INDICATORS);
}

export function getDayTransitionProgress(frame: number): number {
  const progress = rangeProgress(frame, DAY_INDICATOR_TRANSITION_START, DAY_INDICATOR_TRANSITION_END);
  return progress < 0.5 ? 2 * progress ** 2 : 1 - ((-2 * progress + 2) ** 2) / 2;
}

export function getActivityCanvasTranslateY(frame: number): number {
  return -ABSTRACT_CANVAS_SCROLL_DISTANCE * getDayTransitionProgress(frame);
}

export function getDayIndicatorProgress(frame: number, indicatorIndex: number, durationDays: number): number {
  if (indicatorIndex < 0 || indicatorIndex >= getBoundedDayIndicatorCount(durationDays)) return 0;
  const indicator = DAY_INDICATOR_REVEALS[indicatorIndex];
  if (!indicator) return 0;
  return rangeProgress(frame, indicator.start, indicator.end);
}

export function getDayIndicatorOpacity(frame: number, indicatorIndex: number, durationDays: number): number {
  const progress = getDayIndicatorProgress(frame, indicatorIndex, durationDays);
  return 1 - (1 - progress) ** 2;
}

export function getDayIndicatorTranslateY(frame: number, indicatorIndex: number, durationDays: number): number {
  return (1 - getDayIndicatorOpacity(frame, indicatorIndex, durationDays)) * ABSTRACT_DAY_INDICATOR_OFFSET_Y;
}

export const ABSTRACT_DAY_INDICATOR_FRAMES = DAY_INDICATOR_REVEALS;