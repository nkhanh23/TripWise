import {
  ABSTRACT_ROUTE_SEGMENT_HEIGHT,
  getRouteLineProgress,
  getRouteNodeProgress,
  getRouteSegmentProgress,
  getTopAnchoredRouteSegmentTranslateY,
} from '../routeNodeFrames';

describe('MOTION-T003 abstract route/node frame mapping', () => {
  it('keeps the route hidden before F024 and draws each audited segment monotonically', () => {
    expect(getRouteLineProgress(0)).toBe(0);
    expect(getRouteSegmentProgress(24, 0)).toBe(0);
    expect(getRouteSegmentProgress(39, 0)).toBe(1);
    expect(getRouteSegmentProgress(54, 1)).toBe(0);
    expect(getRouteSegmentProgress(68, 1)).toBe(1);
    expect(getRouteSegmentProgress(83, 2)).toBe(0);
    expect(getRouteSegmentProgress(95, 2)).toBe(1);
    expect(getRouteLineProgress(151)).toBe(1);
  });

  it('reveals only abstract nodes at the manifest checkpoints and never derives provider data', () => {
    expect(getRouteNodeProgress(27, 0)).toBe(0);
    expect(getRouteNodeProgress(39, 0)).toBe(1);
    expect(getRouteNodeProgress(56, 1)).toBe(0);
    expect(getRouteNodeProgress(68, 1)).toBe(1);
    expect(getRouteNodeProgress(84, 2)).toBe(0);
    expect(getRouteNodeProgress(95, 2)).toBe(1);
    expect(getRouteNodeProgress(151, 3)).toBe(0);
  });

  it('keeps each route start anchor fixed while its end reveals downwards', () => {
    expect(getTopAnchoredRouteSegmentTranslateY(24, 0)).toBe(-ABSTRACT_ROUTE_SEGMENT_HEIGHT);
    expect(getTopAnchoredRouteSegmentTranslateY(31.5, 0)).toBe(-ABSTRACT_ROUTE_SEGMENT_HEIGHT / 2);
    expect(getTopAnchoredRouteSegmentTranslateY(39, 0)).toBe(0);

    expect(getTopAnchoredRouteSegmentTranslateY(54, 1)).toBe(-ABSTRACT_ROUTE_SEGMENT_HEIGHT);
    expect(getTopAnchoredRouteSegmentTranslateY(68, 1)).toBe(0);
    expect(getTopAnchoredRouteSegmentTranslateY(83, 2)).toBe(-ABSTRACT_ROUTE_SEGMENT_HEIGHT);
    expect(getTopAnchoredRouteSegmentTranslateY(95, 2)).toBe(0);
  });
});