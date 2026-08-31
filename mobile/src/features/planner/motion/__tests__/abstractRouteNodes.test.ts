import {
  ABSTRACT_ROUTE_NODE_SIZE,
  getRouteLineProgress,
  getRouteNodeAnchor,
  getRouteNodeLayout,
  getRouteNodeProgress,
  getRoutePointDistance,
  getRouteSegmentGeometry,
  getRouteSegmentProgress,
  getTopAnchoredRouteSegmentTranslateY,
} from '../routeNodeFrames';

const geometryTolerance = 0.000001;

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

  it('derives a continuous anchor chain and centers every node on its shared endpoint', () => {
    const first = getRouteSegmentGeometry(0)!;
    const second = getRouteSegmentGeometry(1)!;
    const third = getRouteSegmentGeometry(2)!;

    expect(getRoutePointDistance(first.end, second.start)).toBeLessThan(geometryTolerance);
    expect(getRoutePointDistance(second.end, third.start)).toBeLessThan(geometryTolerance);

    [first, second, third].forEach((segment, index) => {
      const nodeAnchor = getRouteNodeAnchor(index)!;
      const nodeLayout = getRouteNodeLayout(index)!;
      expect(getRoutePointDistance(segment.end, nodeAnchor)).toBeLessThan(geometryTolerance);
      expect(nodeLayout.left + ABSTRACT_ROUTE_NODE_SIZE / 2).toBeCloseTo(nodeAnchor.x, 8);
      expect(nodeLayout.top + ABSTRACT_ROUTE_NODE_SIZE / 2).toBeCloseTo(nodeAnchor.y, 8);
    });
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

  it('keeps each calculated route start anchor fixed while its end reveals downward', () => {
    [0, 1, 2].forEach((index) => {
      const geometry = getRouteSegmentGeometry(index)!;
      const segment = [
        { start: 24, end: 39 },
        { start: 54, end: 68 },
        { start: 83, end: 95 },
      ][index]!;
      expect(getTopAnchoredRouteSegmentTranslateY(segment.start, index)).toBeCloseTo(-geometry.length, 8);
      expect(getTopAnchoredRouteSegmentTranslateY((segment.start + segment.end) / 2, index)).toBeCloseTo(-geometry.length / 2, 8);
      expect(getTopAnchoredRouteSegmentTranslateY(segment.end, index)).toBe(0);
    });
  });
});