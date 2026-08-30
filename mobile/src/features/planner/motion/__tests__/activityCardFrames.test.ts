import {
  ABSTRACT_ACTIVITY_CARD_OFFSET_X,
  ABSTRACT_ACTIVITY_CARD_OFFSET_Y,
  getActivityCardOpacity,
  getActivityCardProgress,
  getActivityCardTranslateX,
  getActivityCardTranslateY,
} from '../activityCardFrames';

describe('MOTION-T004 abstract activity-card stagger', () => {
  it('maps the audited stagger ranges and holds each card after its reveal', () => {
    expect(getActivityCardProgress(27, 0)).toBe(0);
    expect(getActivityCardProgress(28, 0)).toBe(0);
    expect(getActivityCardProgress(39, 0)).toBe(1);
    expect(getActivityCardProgress(40, 0)).toBe(1);

    expect(getActivityCardProgress(56, 1)).toBe(0);
    expect(getActivityCardProgress(57, 1)).toBe(0);
    expect(getActivityCardProgress(68, 1)).toBe(1);

    expect(getActivityCardProgress(84, 2)).toBe(0);
    expect(getActivityCardProgress(85, 2)).toBe(0);
    expect(getActivityCardProgress(95, 2)).toBe(1);
  });

  it('uses manifest directions and the audited ease-out opacity without content data', () => {
    expect(getActivityCardTranslateX(28, 0)).toBe(ABSTRACT_ACTIVITY_CARD_OFFSET_X);
    expect(getActivityCardTranslateY(28, 0)).toBe(ABSTRACT_ACTIVITY_CARD_OFFSET_Y);
    expect(getActivityCardTranslateX(39, 0)).toBe(0);
    expect(getActivityCardTranslateY(39, 0)).toBe(0);

    expect(getActivityCardTranslateX(57, 1)).toBe(-ABSTRACT_ACTIVITY_CARD_OFFSET_X);
    expect(getActivityCardTranslateY(57, 1)).toBe(ABSTRACT_ACTIVITY_CARD_OFFSET_Y);
    expect(getActivityCardTranslateX(68, 1)).toBe(0);
    expect(getActivityCardTranslateY(68, 1)).toBe(0);

    expect(getActivityCardTranslateX(85, 2)).toBe(ABSTRACT_ACTIVITY_CARD_OFFSET_X);
    expect(getActivityCardTranslateY(85, 2)).toBe(0);
    expect(getActivityCardTranslateX(95, 2)).toBe(0);
    expect(getActivityCardOpacity(33.5, 0)).toBe(0.75);
    expect(getActivityCardProgress(151, 3)).toBe(0);
  });
});