import { rangeProgress } from './timeline';

export type ActivityCardDirection = 'left' | 'right';

type ActivityCardReveal = {
  direction: ActivityCardDirection;
  end: number;
  start: number;
  translatesUp: boolean;
};

const ACTIVITY_CARD_REVEALS: readonly ActivityCardReveal[] = [
  { start: 28, end: 39, direction: 'right', translatesUp: true },
  { start: 57, end: 68, direction: 'left', translatesUp: true },
  { start: 85, end: 95, direction: 'right', translatesUp: false },
];

export const ABSTRACT_ACTIVITY_CARD_OFFSET_X = 48;
export const ABSTRACT_ACTIVITY_CARD_OFFSET_Y = 18;

export function getActivityCardProgress(frame: number, cardIndex: number): number {
  const card = ACTIVITY_CARD_REVEALS[cardIndex];
  if (!card) return 0;
  return rangeProgress(frame, card.start, card.end);
}

export function getActivityCardOpacity(frame: number, cardIndex: number): number {
  const progress = getActivityCardProgress(frame, cardIndex);
  return 1 - (1 - progress) ** 2;
}

export function getActivityCardTranslateX(frame: number, cardIndex: number): number {
  const card = ACTIVITY_CARD_REVEALS[cardIndex];
  if (!card) return 0;
  const sign = card.direction === 'right' ? 1 : -1;
  const translateX = sign * (1 - getActivityCardProgress(frame, cardIndex)) * ABSTRACT_ACTIVITY_CARD_OFFSET_X;
  return translateX === 0 ? 0 : translateX;
}

export function getActivityCardTranslateY(frame: number, cardIndex: number): number {
  const card = ACTIVITY_CARD_REVEALS[cardIndex];
  if (!card || !card.translatesUp) return 0;
  return (1 - getActivityCardProgress(frame, cardIndex)) * ABSTRACT_ACTIVITY_CARD_OFFSET_Y;
}

export const ABSTRACT_ACTIVITY_CARD_FRAMES = ACTIVITY_CARD_REVEALS;