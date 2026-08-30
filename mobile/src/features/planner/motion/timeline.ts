export const FPS = 24;
export const MAX_FRAME = 239;

export function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}

export function rangeProgress(frame: number, startFrame: number, endFrame: number): number {
  if (startFrame === endFrame) return frame >= startFrame ? 1 : 0;
  return clamp((frame - startFrame) / (endFrame - startFrame), 0, 1);
}

export function timeSecondsToFrame(seconds: number): number {
  return clamp(Math.floor(seconds * FPS), 0, MAX_FRAME);
}

export function frameToTimeSeconds(frame: number): number {
  return clamp(frame, 0, MAX_FRAME) / FPS;
}

export const LIFECYCLE_BOUNDARIES = {
  INITIAL: 0,
  GENERATION_LATCH: 151,
  PERSISTENCE_ENTRY: 152,
  SAVING_HOLD_ENTRY: 161,
  SAVING_HOLD_EXIT: 176,
  SUCCESS_REVEAL: 177,
  CTA_REVEAL: 196,
  FINAL_HOLD: 210,
  END: 239,
};
