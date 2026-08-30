import {
  clamp,
  rangeProgress,
  timeSecondsToFrame,
  frameToTimeSeconds,
  LIFECYCLE_BOUNDARIES,
  FPS,
  MAX_FRAME,
} from '../timeline';

describe('timeline math', () => {
  it('canonical frame math matches bounds', () => {
    expect(timeSecondsToFrame(0)).toBe(0);
    expect(timeSecondsToFrame(1)).toBe(24);
    expect(timeSecondsToFrame(2)).toBe(48);
    expect(timeSecondsToFrame(5)).toBe(120);
    expect(timeSecondsToFrame(LIFECYCLE_BOUNDARIES.GENERATION_LATCH / FPS)).toBe(151);
    expect(timeSecondsToFrame(LIFECYCLE_BOUNDARIES.PERSISTENCE_ENTRY / FPS)).toBe(152);
    expect(timeSecondsToFrame(LIFECYCLE_BOUNDARIES.SAVING_HOLD_ENTRY / FPS)).toBe(161);
    expect(timeSecondsToFrame(LIFECYCLE_BOUNDARIES.SAVING_HOLD_EXIT / FPS)).toBe(176);
    expect(timeSecondsToFrame(LIFECYCLE_BOUNDARIES.SUCCESS_REVEAL / FPS)).toBe(177);
    expect(timeSecondsToFrame(LIFECYCLE_BOUNDARIES.CTA_REVEAL / FPS)).toBe(196);
    expect(timeSecondsToFrame(LIFECYCLE_BOUNDARIES.FINAL_HOLD / FPS)).toBe(210);
    expect(timeSecondsToFrame(LIFECYCLE_BOUNDARIES.END / FPS)).toBe(239);
    expect(timeSecondsToFrame(LIFECYCLE_BOUNDARIES.CTA_REVEAL / FPS)).toBe(196);
    expect(timeSecondsToFrame(LIFECYCLE_BOUNDARIES.FINAL_HOLD / FPS)).toBe(210);
    expect(timeSecondsToFrame(10)).toBe(MAX_FRAME); // 10s * 24 = 240 -> clamped to 239
  });

  it('frame clamping works correctly', () => {
    expect(clamp(-5, 0, MAX_FRAME)).toBe(0);
    expect(clamp(300, 0, MAX_FRAME)).toBe(MAX_FRAME);
    expect(timeSecondsToFrame(-1)).toBe(0);
    expect(timeSecondsToFrame(100)).toBe(MAX_FRAME);
  });

  it('time to frame and back preserves values', () => {
    const frame = 120;
    const time = frameToTimeSeconds(frame);
    expect(time).toBe(5);
    expect(timeSecondsToFrame(time)).toBe(frame);
  });

  it('range progress calculates correctly', () => {
    expect(rangeProgress(50, 0, 100)).toBe(0.5);
    expect(rangeProgress(-10, 0, 100)).toBe(0);
    expect(rangeProgress(150, 0, 100)).toBe(1);
    expect(rangeProgress(50, 50, 50)).toBe(1); // identical bounds
  });

  
});
