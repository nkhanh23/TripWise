import { clamp, rangeProgress } from './timeline';

export type RouteAnchor = Readonly<{ x: number; y: number }>;

type RouteSegmentTiming = Readonly<{ end: number; start: number }>;

export type RouteSegmentGeometry = Readonly<{
  end: RouteAnchor;
  left: number;
  length: number;
  rotationDegrees: number;
  start: RouteAnchor;
  top: number;
}>;

const ROUTE_ANCHOR_CHAIN: readonly RouteAnchor[] = [
  { x: 148, y: 20 },
  { x: 128, y: 124 },
  { x: 170, y: 216 },
  { x: 142, y: 308 },
];

const ROUTE_SEGMENTS: readonly RouteSegmentTiming[] = [
  { start: 24, end: 39 },
  { start: 54, end: 68 },
  { start: 83, end: 95 },
];

const NODE_REVEALS: readonly RouteSegmentTiming[] = [
  { start: 28, end: 39 },
  { start: 57, end: 68 },
  { start: 85, end: 95 },
];

export const ABSTRACT_ROUTE_LINE_WIDTH = 3;
export const ABSTRACT_ROUTE_NODE_SIZE = 20;

export function getRoutePointDistance(first: RouteAnchor, second: RouteAnchor): number {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

/**
 * Each geometry item is derived from two adjacent chain anchors. Rendering a
 * vertical segment around this calculated centre and rotating it produces an
 * exact start/end pair instead of visually guessed independent positions.
 */
export function getRouteSegmentGeometry(segmentIndex: number): RouteSegmentGeometry | null {
  const start = ROUTE_ANCHOR_CHAIN[segmentIndex];
  const end = ROUTE_ANCHOR_CHAIN[segmentIndex + 1];
  if (!start || !end) return null;

  const length = getRoutePointDistance(start, end);
  const rotationDegrees = Math.atan2(end.x - start.x, end.y - start.y) * (180 / Math.PI);
  return {
    start,
    end,
    length,
    rotationDegrees,
    left: (start.x + end.x) / 2 - ABSTRACT_ROUTE_LINE_WIDTH / 2,
    top: (start.y + end.y) / 2 - length / 2,
  };
}

/** A node marks the shared end/start anchor between the sequential route reveals. */
export function getRouteNodeAnchor(nodeIndex: number): RouteAnchor | null {
  return ROUTE_ANCHOR_CHAIN[nodeIndex + 1] ?? null;
}

export function getRouteNodeLayout(nodeIndex: number): Readonly<{ left: number; top: number }> | null {
  const anchor = getRouteNodeAnchor(nodeIndex);
  if (!anchor) return null;
  return {
    left: anchor.x - ABSTRACT_ROUTE_NODE_SIZE / 2,
    top: anchor.y - ABSTRACT_ROUTE_NODE_SIZE / 2,
  };
}

export function getRouteSegmentProgress(frame: number, segmentIndex: number): number {
  const segment = ROUTE_SEGMENTS[segmentIndex];
  if (!segment) return 0;
  return rangeProgress(frame, segment.start, segment.end);
}

/**
 * The fill lives in a clipped window whose top is the segment's calculated
 * start anchor. Translation reveals downward toward its exact end anchor.
 */
export function getTopAnchoredRouteSegmentTranslateY(frame: number, segmentIndex: number): number {
  const geometry = getRouteSegmentGeometry(segmentIndex);
  if (!geometry) return 0;
  return (getRouteSegmentProgress(frame, segmentIndex) - 1) * geometry.length;
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