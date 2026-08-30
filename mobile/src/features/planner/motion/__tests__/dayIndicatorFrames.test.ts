import {
  ABSTRACT_CANVAS_SCROLL_DISTANCE,
  ABSTRACT_DAY_INDICATOR_OFFSET_Y,
  getActivityCanvasTranslateY,
  getBoundedDayIndicatorCount,
  getDayIndicatorOpacity,
  getDayIndicatorProgress,
  getDayIndicatorTranslateY,
  getDayTransitionProgress,
} from '../dayIndicatorFrames';

describe('MOTION-T005 bounded abstract day indicators', () => {
  it('keeps duration density bounded instead of creating an indicator for every day', () => {
    expect(getBoundedDayIndicatorCount(-1)).toBe(0);
    expect(getBoundedDayIndicatorCount(0)).toBe(0);
    expect(getBoundedDayIndicatorCount(1)).toBe(1);
    expect(getBoundedDayIndicatorCount(2)).toBe(2);
    expect(getBoundedDayIndicatorCount(3)).toBe(3);
    expect(getBoundedDayIndicatorCount(4)).toBe(3);
    expect(getBoundedDayIndicatorCount(365)).toBe(3);
  });

  it('moves the prior route/activity canvas upward with audited ease-in-out over F110–F151', () => {
    expect(getDayTransitionProgress(109)).toBe(0);
    expect(getDayTransitionProgress(110)).toBe(0);
    expect(getDayTransitionProgress(130.5)).toBe(0.5);
    expect(getDayTransitionProgress(151)).toBe(1);
    expect(getActivityCanvasTranslateY(110)).toBe(0);
    expect(getActivityCanvasTranslateY(130.5)).toBe(-ABSTRACT_CANVAS_SCROLL_DISTANCE / 2);
    expect(getActivityCanvasTranslateY(151)).toBe(-ABSTRACT_CANVAS_SCROLL_DISTANCE);
  });

  it('reveals only the bounded abstract indicators within F110–F151', () => {
    expect(getDayIndicatorProgress(110, 0, 3)).toBe(0);
    expect(getDayIndicatorProgress(124, 0, 3)).toBe(1);
    expect(getDayIndicatorProgress(124, 1, 3)).toBe(0);
    expect(getDayIndicatorProgress(138, 1, 3)).toBe(1);
    expect(getDayIndicatorProgress(138, 2, 3)).toBe(0);
    expect(getDayIndicatorProgress(151, 2, 3)).toBe(1);
    expect(getDayIndicatorProgress(151, 1, 1)).toBe(0);
    expect(getDayIndicatorOpacity(117, 0, 3)).toBe(0.75);
    expect(getDayIndicatorTranslateY(117, 0, 3)).toBe(ABSTRACT_DAY_INDICATOR_OFFSET_Y / 4);
  });
});