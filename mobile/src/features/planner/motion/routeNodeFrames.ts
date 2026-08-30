import { clamp, rangeProgress } from './timeline';

const ROUTE_SEGMENTS = [
  { start: 24, end: 39 },
  { start: 54, end: 68 },
  { start: 83, end: 95 },
] as const;

const NODE_REVEALS = [
  { start: 28, end: 39 },
  { start: 57, end: 68 },
  { start: 85, end: 95 },
] as const;

export const ABSTRACT_ROUTE_SEGMENT_HEIGHT = 44;

export function getRouteSegmentProgress(frame: number, segmentIndex: number): number {
  const segment = ROUTE_SEGMENTS[segmentIndex];
  if (!segment) return 0;
  return rangeProgress(frame, segment.start, segment.end);
}

/**
 * The segment lives in a fixed-height clipped window. Translating its full
 * height from above the window keeps the start anchor fixed and reveals the
 * line toward its end anchor, rather than scaling around its centre.
 */
export function getTopAnchoredRouteSegmentTranslateY(frame: number, segmentIndex: number): number {
  return (getRouteSegmentProgress(frame, segmentIndex) - 1) * ABSTRACT_ROUTE_SEGMENT_HEIGHT;
}

export function getRouteLineProgress(frame: number): number {
  return clamp(
    ROUTE_SEGMENTS.reduce(
      (progress, _segment, index) => progress + getRouteSegmentProgress(frame, index) / ROUTE_SEGMENTS.length,
      0,
    ),
    0,
    1,
  );
}

export function getRouteNodeProgress(frame: number, nodeIndex: number): number {
  const node = NODE_REVEALS[nodeIndex];
  if (!node) return 0;
  return rangeProgress(frame, node.start, node.end);
}

export const ABSTRACT_ROUTE_NODE_FRAMES = {
  routeSegments: ROUTE_SEGMENTS,
  nodes: NODE_REVEALS,
} as const;